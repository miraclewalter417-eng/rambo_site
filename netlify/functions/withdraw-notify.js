const md5 = require("md5");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  try {
    // 1. Parse incoming parameters (NekPayment sends x-www-form-urlencoded)
    const params = new URLSearchParams(event.body);
    const data = Object.fromEntries(params.entries());

    console.log("--- WITHDRAWAL CALLBACK RECEIVED ---");
    console.log("Incoming Data:", JSON.stringify(data));

    const key = process.env.WITHDRAWAL_KEY;

    // 2. Verify Signature
    const keys = ["applyDate", "merNo", "merTransferId", "respCode", "tradeNo", "tradeResult", "transferAmount", "version"];
    const signString = keys.map(k => `${k}=${data[k] || ""}`).join("&") + `&key=${key}`;
    const expectedSign = md5(signString);

    // FIX: this check now actually blocks unsigned/forged callbacks
    // instead of just logging and continuing. Without this, anyone
    // could POST a fake "failed" result for any merTransferId and
    // trigger an automatic refund to a wallet for a withdrawal that
    // the bank never actually rejected.
    if (data.sign !== expectedSign) {
      console.error("Withdrawal Signature Mismatch! Expected:", expectedSign, "Got:", data.sign);
      return { statusCode: 400, body: "Invalid Signature" };
    }

    const withdrawalId = data.merTransferId;
    if (!withdrawalId) {
      console.error("No merTransferId found in notification.");
      return { statusCode: 200, body: "success" };
    }

    const withdrawRef = db.collection("withdrawals").doc(withdrawalId);

    // 3. Determine the new status from the verified payload
    let newStatus = "processing";
    if (data.tradeResult === "1" || data.respCode === "SUCCESS") {
      newStatus = "success";
    } else if (data.tradeResult === "2" || data.respCode === "FAIL") {
      newStatus = "failed";
    }

    // FIX: the read-check-write for status transition and the refund
    // are now both inside a single transaction. The old version did
    // a plain get() + status check, then a separate update() and a
    // separate runTransaction() for the refund. If the gateway fired
    // this webhook twice quickly, both calls could pass the "not yet
    // finished" check before either wrote the new status - leading to
    // a double refund. Wrapping the whole decision in one transaction
    // makes Firestore serialize concurrent attempts.
    const result = await db.runTransaction(async (t) => {
      const withdrawDoc = await t.get(withdrawRef);

      if (!withdrawDoc.exists) {
        return { outcome: "not_found" };
      }

      const currentData = withdrawDoc.data();

      if (currentData.status === "success" || currentData.status === "failed") {
        return { outcome: "already_finished", status: currentData.status };
      }

      t.update(withdrawRef, {
        status: newStatus,
        bankTradeNo: data.tradeNo || "",
        notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        rawNotifyData: data,
      });

      if (newStatus === "failed") {
        const { uid, originalAmount } = currentData;

        if (!uid || !originalAmount || originalAmount <= 0) {
          console.error(`Withdrawal ${withdrawalId} marked failed but missing/invalid uid or originalAmount - skipping refund, needs manual review.`);
          t.update(withdrawRef, { refundError: "missing_or_invalid_amount_or_uid" });
          return { outcome: "failed_no_refund" };
        }

        const userRef = db.collection("users").doc(uid);
        const userDoc = await t.get(userRef);

        if (!userDoc.exists) {
          console.error(`User ${uid} not found - cannot refund withdrawal ${withdrawalId}.`);
          t.update(withdrawRef, { refundError: "user_not_found" });
          return { outcome: "failed_no_refund" };
        }

        const currentBalance = userDoc.data().balance || 0;
        t.update(userRef, { balance: currentBalance + originalAmount });
        t.update(withdrawRef, { refunded: true });

        return { outcome: "failed_refunded", uid, amount: originalAmount };
      }

      return { outcome: newStatus };
    });

    if (result.outcome === "not_found") {
      console.error(`Withdrawal record ${withdrawalId} not found in Firestore.`);
    } else if (result.outcome === "already_finished") {
      console.log(`Withdrawal ${withdrawalId} already finished as ${result.status}.`);
    } else if (result.outcome === "failed_refunded") {
      console.log(`Refunded ₦${result.amount} to User ${result.uid} (Bank rejected transfer).`);
    } else {
      console.log(`Setting status to: ${newStatus} for ID: ${withdrawalId}`);
    }

    // Always tell the gateway "success" so they stop retrying the notification
    return { statusCode: 200, body: "success" };

  } catch (err) {
    console.error("Withdrawal Notify Error:", err);
    return { statusCode: 500, body: "error" };
  }
};
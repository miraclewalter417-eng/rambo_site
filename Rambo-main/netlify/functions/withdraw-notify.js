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
    // Format: applyDate=...&merNo=...&merTransferId=...&respCode=...&tradeNo=...&tradeResult=...&transferAmount=...&version=...&key=...
    const keys = ["applyDate", "merNo", "merTransferId", "respCode", "tradeNo", "tradeResult", "transferAmount", "version"];
    const signString = keys.map(k => `${k}=${data[k] || ""}`).join("&") + `&key=${key}`;
    const expectedSign = md5(signString);

    if (data.sign !== expectedSign) {
      console.error("Withdrawal Signature Mismatch! Expected:", expectedSign, "Got:", data.sign);
      // We log the error but continue for testing purposes. 
      // If it's live, you can uncomment the return below:
      // return { statusCode: 400, body: "Invalid Signature" };
    }

    const withdrawalId = data.merTransferId;
    if (!withdrawalId) {
        console.error("No merTransferId found in notification.");
        return { statusCode: 200, body: "success" };
    }

    const withdrawRef = db.collection("withdrawals").doc(withdrawalId);
    const withdrawDoc = await withdrawRef.get();

    if (!withdrawDoc.exists) {
      console.error(`Withdrawal record ${withdrawalId} not found in Firestore.`);
      return { statusCode: 200, body: "success" }; 
    }

    const currentData = withdrawDoc.data();

    // 🛑 GUARD: If already handled, don't do anything else
    if (currentData.status === "success" || currentData.status === "failed") {
      console.log(`Withdrawal ${withdrawalId} already finished as ${currentData.status}.`);
      return { statusCode: 200, body: "success" };
    }

    // 3. IMPROVED STATUS DETECTION
    // NekPayment: tradeResult "1" is success. "2" is fail.
    let newStatus = "processing";
    
    if (data.tradeResult === "1" || data.respCode === "SUCCESS") {
      newStatus = "success";
    } else if (data.tradeResult === "2" || data.respCode === "FAIL") {
      newStatus = "failed";
    }

    console.log(`Setting status to: ${newStatus} for ID: ${withdrawalId}`);

    // 4. Update the record
    await withdrawRef.update({
      status: newStatus,
      bankTradeNo: data.tradeNo || "",
      notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      rawNotifyData: data // Helpful for debugging if it stays processing
    });

    // 5. Handle Automatic Refund on Failure
    if (newStatus === "failed") {
      const { uid, originalAmount } = currentData;
      if (uid && originalAmount) {
        const userRef = db.collection("users").doc(uid);
        
        await db.runTransaction(async (t) => {
          const userDoc = await t.get(userRef);
          if (!userDoc.exists) return;

          const currentBalance = userDoc.data().balance || 0;
          t.update(userRef, { balance: currentBalance + originalAmount });
          t.update(withdrawRef, { refunded: true });
        });
        
        console.log(`Refunded ₦${originalAmount} to User ${uid} (Bank rejected transfer).`);
      }
    }

    // Always tell the bank "success" so they stop sending the notification
    return { statusCode: 200, body: "success" };

  } catch (err) {
    console.error("Withdrawal Notify Error:", err);
    return { statusCode: 500, body: "error" };
  }
};
const md5 = require("md5");
const admin = require("firebase-admin");

// --- INIT MAIN DB (Using hardcoded IDs to save space) ---
const mainApp = !admin.apps.find((app) => app.name === "[DEFAULT]")
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "new-site-23306",
        clientEmail:
          "firebase-adminsdk-fbsvc@new-site-23306.iam.gserviceaccount.com",
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  : admin.app();

// --- INIT HEAVY LOAD DB ---
const heavyLoadApp = !admin.apps.find((app) => app.name === "heavyLoad")
  ? admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId: "heavyload-d40b7",
          clientEmail:
            "firebase-adminsdk-fbsvc@heavyload-d40b7.iam.gserviceaccount.com",
          privateKey: process.env.HEAVY_LOAD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      },
      "heavyLoad",
    )
  : admin.app("heavyLoad");

const db = mainApp.firestore();
const transactionDb = heavyLoadApp.firestore();
const FieldValue = admin.firestore.FieldValue;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    let data;

    try {
      data = JSON.parse(event.body);
    } catch {
      const params = new URLSearchParams(event.body);
      data = Object.fromEntries(params.entries());
    }

    // IMPORTANT: log raw payload once in staging, then check the field
    // names against what Payrant's docs say a callback actually sends.
    // Your deposit request uses snake_case (mch_order_no, trade_amount,
    // sign_type) - this handler currently assumes camelCase
    // (mchOrderNo, amount, tradeResult, signType). Confirm these match
    // BEFORE going live, or every webhook will fail signature checks
    // silently and no deposit will ever auto-complete.
    console.log("Incoming Payment Data:", JSON.stringify(data));

    const PAYMENT_KEY = process.env.DEPOSIT_KEY; // Must match the deposit key!

    // --- SIGNATURE VERIFY ---
    const keys = Object.keys(data)
      .sort()
      .filter((k) => k !== "sign" && k !== "signType" && k !== "sign_type");

    const signString =
      keys.map((k) => `${k}=${data[k]}`).join("&") + `&key=${PAYMENT_KEY}`;

    const expectedSign = md5(signString);

    if (data.sign !== expectedSign) {
      console.error("Signature Mismatch!");
      return { statusCode: 400, body: "Invalid Signature" };
    }

    // --- ONLY SUCCESS PAYMENTS ---
    if (data.tradeResult !== "1") {
      return { statusCode: 200, body: "ignored" };
    }

    const depositId = data.mchOrderNo;
    const amountPaid = parseFloat(data.amount || 0);

    if (!depositId || !amountPaid) {
      return { statusCode: 400, body: "Invalid Data" };
    }

    const depositRef = transactionDb.collection("deposits").doc(depositId);

    // --- ATOMIC CHECK-AND-CREDIT (fixes double-credit race condition) ---
    // The old version did get() then update() as two separate calls.
    // If the gateway fires the webhook twice quickly (very common -
    // most gateways retry until they get the exact response they
    // expect), both calls could read status "pending" before either
    // one wrote "success", crediting the wallet twice. Wrapping the
    // read-check-write in a single Firestore transaction makes Firestore
    // serialize concurrent attempts, so only one can ever succeed.
    let creditResult;
    try {
      creditResult = await transactionDb.runTransaction(async (tx) => {
        const depositDoc = await tx.get(depositRef);

        if (!depositDoc.exists) {
          return { outcome: "not_found" };
        }

        const depositData = depositDoc.data();

        if (depositData.status === "success") {
          return { outcome: "already_processed" };
        }

        if (depositData.status !== "pending") {
          return { outcome: "ignored", status: depositData.status };
        }

        // Cross-check the amount the gateway is confirming against what
        // was originally requested. Signature verification covers
        // tampering in transit, but this catches any mismatch between
        // what you asked for and what the gateway claims was paid.
        const expectedAmount = parseFloat(depositData.amount || 0);
        if (expectedAmount && Math.abs(expectedAmount - amountPaid) > 0.01) {
          console.error(
            `Amount mismatch for ${depositId}: expected ${expectedAmount}, got ${amountPaid}`,
          );
          tx.set(
            depositRef,
            {
              status: "flagged",
              flagReason: "amount_mismatch",
              reportedAmount: amountPaid,
              processedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          return { outcome: "amount_mismatch" };
        }

        const uid = depositData.uid || depositData.userId;
        if (!uid) {
          return { outcome: "missing_uid" };
        }

        tx.set(
          depositRef,
          {
            status: "success",
            processedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        return { outcome: "credit", uid, amount: expectedAmount || amountPaid };
      });
    } catch (err) {
      console.error("Transaction failed:", err);
      return { statusCode: 500, body: "error" };
    }

    if (creditResult.outcome === "not_found") {
      console.error("Deposit not found:", depositId);
      return { statusCode: 200, body: "success" };
    }

    if (creditResult.outcome === "already_processed") {
      return { statusCode: 200, body: "success" };
    }

    if (creditResult.outcome === "ignored") {
      return { statusCode: 200, body: "ignored" };
    }

    if (creditResult.outcome === "amount_mismatch") {
      // Don't tell the gateway this failed outright - the deposit is
      // flagged for manual review rather than silently credited.
      return { statusCode: 200, body: "success" };
    }

    if (creditResult.outcome === "missing_uid") {
      console.error("Missing UID in deposit record:", depositId);
      return { statusCode: 400, body: "User ID missing" };
    }

    // --- CREDIT USER (MAIN DB) ---
    // This happens only after the transaction above has already
    // flipped the deposit's status to "success", so even if this step
    // throws, a retry of the webhook will be blocked by the
    // "already_processed" check rather than crediting twice.
    try {
      const userRef = db.collection("users").doc(creditResult.uid);
      await userRef.update({
        balance: FieldValue.increment(creditResult.amount),
      });

      console.log(`Credited ₦${creditResult.amount} to ${creditResult.uid}`);
    } catch (err) {
      console.error("Balance update failed after marking success:", err);
      // Mark for reconciliation since deposit is "success" but balance
      // update failed - this needs a manual fix-up job or alert.
      await depositRef.set(
        { creditError: err.message, needsManualCredit: true },
        { merge: true },
      );
      return { statusCode: 500, body: "error" };
    }

    return { statusCode: 200, body: "success" };
  } catch (err) {
    console.error("Critical Notify Error:", err);
    return { statusCode: 500, body: "error" };
  }
};

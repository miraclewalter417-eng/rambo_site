const md5 = require("md5");
const admin = require("firebase-admin");

// --- INIT MAIN DB (Using hardcoded IDs to save space) ---
const mainApp = !admin.apps.find(app => app.name === "[DEFAULT]")
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "new-site-23306",
        clientEmail: "firebase-adminsdk-fbsvc@new-site-23306.iam.gserviceaccount.com",
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  : admin.app();

// --- INIT HEAVY LOAD DB ---
const heavyLoadApp = !admin.apps.find(app => app.name === "heavyLoad")
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "heavyload-d40b7",
        clientEmail: "firebase-adminsdk-fbsvc@heavyload-d40b7.iam.gserviceaccount.com",
        privateKey: process.env.HEAVY_LOAD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    }, "heavyLoad")
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

    console.log("Incoming Payment Data:", JSON.stringify(data));

    // Change this line in your NOTIFY function:
const PAYMENT_KEY = process.env.DEPOSIT_KEY; // Must match the deposit key!
   

    // --- SIGNATURE VERIFY ---
    const keys = Object.keys(data)
      .sort()
      .filter(k => k !== "sign" && k !== "signType");

    const signString =
      keys.map(k => `${k}=${data[k]}`).join("&") + `&key=${PAYMENT_KEY}`;

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
    const depositDoc = await depositRef.get();

    if (!depositDoc.exists) {
      console.error("Deposit not found:", depositId);
      return { statusCode: 200, body: "success" };
    }

    const depositData = depositDoc.data();

    // --- PREVENT DOUBLE CREDIT ---
    if (depositData.status === "success") {
      return { statusCode: 200, body: "success" };
    }

    if (depositData.status !== "pending") {
      return { statusCode: 200, body: "ignored" };
    }

    const uid = depositData.uid || depositData.userId;

    if (!uid) {
      console.error("Missing UID in deposit record");
      return { statusCode: 400, body: "User ID missing" };
    }

    try {
      // --- CREDIT USER (MAIN DB) ---
      const userRef = db.collection("users").doc(uid);

      await userRef.update({
        balance: FieldValue.increment(amountPaid),
      });

      // --- MARK DEPOSIT SUCCESS (HEAVY DB) ---
      await depositRef.set(
        {
          status: "success",
          processedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`Credited ₦${amountPaid} to ${uid}`);

    } catch (err) {
      console.error("Update failed:", err);
      return { statusCode: 500, body: "error" };
    }

    return { statusCode: 200, body: "success" };

  } catch (err) {
    console.error("Critical Notify Error:", err);
    return { statusCode: 500, body: "error" };
  }
};
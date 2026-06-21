const md5 = require("md5");
const admin = require("firebase-admin");

// --- INIT MAIN DB (Using hardcoded IDs to save space) ---
const mainApp = !admin.apps.find((app) => app.name === "[DEFAULT]")
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "mimiads-market",
        clientEmail: "firebase-adminsdk-fbsvc@mimiads-market.iam.gserviceaccount.com",
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  : admin.app();

// --- INIT HEAVY LOAD DB ---
const heavyLoadApp = !admin.apps.find((app) => app.name === "heavyLoad")
  ? admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId: "oga-viral",
          clientEmail: "firebase-adminsdk-fbsvc@oga-viral.iam.gserviceaccount.com",
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

    console.log("Incoming Payment Data (oga-viral context):", JSON.stringify(data));

    const PAYMENT_KEY = process.env.DEPOSIT_KEY;

    // 2. Verify signature
    const signFields = ["amount", "mchId", "mchOrderNo", "merRetMsg", "orderDate", "orderNo", "oriAmount", "tradeResult"];
    const signString = signFields
      .filter(k => data[k] !== undefined && data[k] !== null && data[k] !== "")
      .map(k => `${k}=${data[k]}`)
      .join("&") + `&key=${PAYMENT_KEY}`;

    const expectedSign = md5(signString);

    if (data.sign !== expectedSign) {
      console.error("Signature Mismatch!");
      // return { statusCode: 400, body: "Invalid Signature" };
    }

    // 3. Only process successful payments
    if (data.tradeResult !== "1") {
      console.log("Trade result not successful:", data.tradeResult);
      return { statusCode: 200, body: "success" };
    }

    const depositId = data.mchOrderNo;
    const amountPaid = parseFloat(data.amount || 0);

    if (!depositId || !amountPaid) {
      console.error("Missing depositId or amount");
      return { statusCode: 400, body: "Invalid Data" };
    }

    // 4. Fetch deposit from oga-viral
    const depositRef = transactionDb.collection("deposits").doc(depositId);
    const depositDoc = await depositRef.get();

    if (!depositDoc.exists) {
      console.error("Deposit not found in oga-viral:", depositId);
      return { statusCode: 200, body: "success" };
    }

    const depositData = depositDoc.data();

    // 5. Prevent double processing
    if (depositData.status === "success") {
      return { statusCode: 200, body: "success" };
    }

    // 6. Accept pending, awaiting_payment or processing
    const validStatuses = ["pending", "awaiting_payment", "processing"];
    if (!validStatuses.includes(depositData.status)) {
      return { statusCode: 200, body: "success" };
    }

    const uid = depositData.uid || depositData.userId;
    if (!uid) {
      return { statusCode: 400, body: "User ID missing" };
    }

    // 7. Credit balance in flash-sales-8f768
    const userRef = mainDb.collection("users").doc(uid);
    await userRef.set({
      balance: FieldValue.increment(amountPaid),
    }, { merge: true });

    // 8. Mark deposit as success in oga-viral
    await depositRef.set({
      status: "success",
      processedAt: FieldValue.serverTimestamp(),
      finalAmount: amountPaid,
      gatewayOrderNo: data.orderNo ?? null,
    }, { merge: true });

    console.log(`Successfully credited ₦${amountPaid} to User: ${uid} in flash-sales-8f768`);

    return { statusCode: 200, body: "success" };

  } catch (err) {
    console.error("Critical Notify Error:", err);
    return { statusCode: 500, body: "error" };
  }
};
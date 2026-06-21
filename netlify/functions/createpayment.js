const md5 = require("md5");
const admin = require("firebase-admin");

const formatKey = (key) => key ? key.replace(/\\n/g, '\n').replace(/\n\s+/g, '\n').trim() : undefined;

// 1. MAIN App initialization (Project: mimiads-market)
const mainApp = !admin.apps.find(app => app.name === "[DEFAULT]")
  ? admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "mimiads-market",
      clientEmail: "firebase-adminsdk-fbsvc@mimiads-market.iam.gserviceaccount.com",
      privateKey: formatKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  })
  : admin.app();

// 2. HEAVY LOAD App initialization (Project: oga-viral)
const heavyLoadApp = !admin.apps.find(app => app.name === "heavyLoad")
  ? admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "oga-viral",
      clientEmail: "firebase-adminsdk-fbsvc@oga-viral.iam.gserviceaccount.com",
      privateKey: formatKey(process.env.HEAVY_LOAD_PRIVATE_KEY),
    }),
  }, "heavyLoad")
  : admin.app("heavyLoad");

const mainDb = mainApp.firestore();
const transactionDb = heavyLoadApp.firestore();
const FieldValue = admin.firestore.FieldValue;

exports.handler = async (event) => {
  console.log("DEBUG: VERSION 5 - Using Project IDs: mimiads-market & oga-viral");

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" } };
  }

  try {
    const { amount, depositId, userId } = JSON.parse(event.body);

    const MERCHANT_ID = process.env.MERCHANT_ID;
    const PAYMENT_KEY = process.env.DEPOSIT_KEY;

    console.log("DEBUG: Raw Input", { amount, depositId, userId });

    // ---- STEP 1: CREATE PENDING DEPOSIT in oga-viral ----
    await transactionDb.collection("deposits").doc(depositId).set({
      uid: userId || "unknown_user",
      orderNo: depositId,
      amount: parseFloat(amount),
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      gateway: "NekPayment",
      expiresAt: Date.now() + (15 * 60 * 1000),
    }, { merge: true });

    console.log("DEBUG: Pending deposit created in transactionDb (oga-viral)");

    // ---- STEP 2: BUILD GATEWAY PAYLOAD ----
    const data = {
      bank_code: "NGR044",
      goods_name: "Wallet Deposit",
      mch_id: MERCHANT_ID,
      mch_order_no: depositId,
      mch_return_msg: "deposit",
      notify_url: "https://ramboinvestment.website/functions/notify",
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      page_url: "https://ramboinvestment.website",
      pay_type: "523",
      trade_amount: parseFloat(amount).toFixed(2),
      version: "1.0",
    };  

    // ---- STEP 3: SIGN ----
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys.map(k => `${k}=${data[k]}`).join("&") + `&key=${PAYMENT_KEY}`;
    data.sign = md5(signString);
    data.sign_type = "MD5";

    // ---- STEP 4: SEND TO GATEWAY ----
    const params = new URLSearchParams(data);
    const response = await fetch("https://api.nekpayment.com/pay/web", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Invalid JSON response from gateway: " + responseText);
    }

    // ---- STEP 5: HANDLE SUCCESS ----
    if (result?.respCode === "SUCCESS" && result?.payInfo) {
      await transactionDb.collection("deposits").doc(depositId).set({
        status: "awaiting_payment",
        gatewayOrderNo: result.orderNo ?? null,
        payInfo: result.payInfo,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ respCode: "SUCCESS", payInfo: result.payInfo }),
      };
    }

    // ---- STEP 6: HANDLE FAILURE ----
    await transactionDb.collection("deposits").doc(depositId).set({
      status: "failed",
      failReason: result?.tradeMsg ?? "Unknown error",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ respCode: "FAIL", tradeMsg: result?.tradeMsg }),
    };

  } catch (err) {
    console.error("DEBUG: Function Error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ respCode: "ERROR", tradeMsg: err.message }),
    };
  }
};

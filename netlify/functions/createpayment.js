const md5 = require("md5");
const admin = require("firebase-admin");

// --- INIT MAIN DB (Hardcoded IDs to save space) ---
const mainApp = !admin.apps.find((app) => app.name === "[DEFAULT]")
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "mimiads-market",
        clientEmail:
          "firebase-adminsdk-fbsvc@mimiads-market.iam.gserviceaccount.com",
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  : admin.app();

// --- INIT HEAVY DB (Hardcoded IDs to save space) ---
const heavyLoadApp = !admin.apps.find((app) => app.name === "heavyLoad")
  ? admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId: "oga-viral",
          clientEmail:
            "firebase-adminsdk-fbsvc@oga-viral.iam.gserviceaccount.com",
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
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  try {
    const { amount, depositId, userId } = JSON.parse(event.body);

    // Change these lines in your DEPOSIT function:
    const MERCHANT_ID = process.env.MERCHANT_ID;
    const PAYMENT_KEY = process.env.DEPOSIT_KEY; // Use the Deposit Key here!

    // !!! STILL UNCONFIRMED: field names below (mch_id, pay_type,
    // trade_amount, bank_code etc.) are inherited from Nekpayment and
    // have NOT been verified against Payrant's actual API spec. Same
    // for the MD5 sorted-params signing method - Payrant may sign
    // differently. This will likely fail or silently misbehave until
    // confirmed against their real docs.
    const data = {
      bank_code: "NGR044",
      goods_name: "Wallet Deposit",
      mch_id: MERCHANT_ID,
      mch_order_no: depositId,
      mch_return_msg: "deposit",
      notify_url:
        "https://ramboinvestment.netlify.app/.netlify/functions/notify",
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      page_url: "https://ramboinvestment.netlify.app/",
      pay_type: "523",
      trade_amount: parseFloat(amount).toFixed(2),
      version: "1.0",
    };

    const keys = Object.keys(data).sort();
    const signString =
      keys.map((k) => `${k}=${data[k]}`).join("&") + `&key=${PAYMENT_KEY}`;

    data.sign = md5(signString);
    data.sign_type = "MD5";

    // --- STEP 1: SAFE WRITE (no crash if doc doesn't exist) ---
    await transactionDb
      .collection("deposits")
      .doc(depositId)
      .set(
        {
          userId: userId || "unknown_user",
          orderNo: depositId,
          amount: parseFloat(amount),
          status: "pending",
          timestamp: FieldValue.serverTimestamp(),
          gateway: "payrant",

          // CLEAN EXPIRY
          expiresAt: Date.now() + 15 * 60 * 1000,
        },
        { merge: true },
      );

    // --- STEP 2: SEND TO GATEWAY ---
    // !!! Endpoint path "/pay/web" is unconfirmed for Payrant - it was
    // copied from Nekpayment. Fixed the double-slash typo, but the
    // path itself still needs verification against Payrant's docs.
    const params = new URLSearchParams(data);

    const response = await fetch("https://api.payrant.com/pay/web", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const result = await response.json();

    // --- SUCCESS ---
    if (result?.respCode === "SUCCESS" && result?.payInfo) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          respCode: "SUCCESS",
          payInfo: result.payInfo,
        }),
      };
    }

    // --- FAIL ---
    await transactionDb
      .collection("deposits")
      .doc(depositId)
      .set(
        {
          status: "failed",
          failReason: result?.tradeMsg || "Gateway Error",
        },
        { merge: true },
      );

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        respCode: "FAIL",
        tradeMsg: result?.tradeMsg || "Payment Gateway Error",
      }),
    };
  } catch (err) {
    console.error("Function Crash:", err);

    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        respCode: "ERROR",
        tradeMsg: err.message,
      }),
    };
  }
};

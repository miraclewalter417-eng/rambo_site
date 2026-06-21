const md5 = require("md5");
const admin = require("firebase-admin");

const formatKey = (key) => key ? key.replace(/\\n/g, '\n').replace(/\n\s+/g, '\n').trim() : undefined;

// --- INIT MAIN DB (Project: mimiads-market) ---
const mainApp = !admin.apps.find(app => app.name === "[DEFAULT]")
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "mimiads-market",
        clientEmail: "firebase-adminsdk-fbsvc@mimiads-market.iam.gserviceaccount.com",
        privateKey: formatKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
    })
  : admin.app();

// --- INIT CORE NEXT DB (Hardcoded Credentials) ---
const coreNextApp = !admin.apps.find(app => app.name === "coreNext")
  ? admin.initializeApp({ 
      credential: admin.credential.cert({ 
        projectId: "ads-manager-b7cf2", 
        clientEmail: "firebase-adminsdk-fbsvc@ads-manager-b7cf2.iam.gserviceaccount.com", 
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDDmwOs2JsO3bMo\n5cumSOFAkHwqrrN174k/U1rIIXmHdag9LbtoVZlKbwhklrb6SzV5uogKkW07iM1j\nTbReovdbFrczinuI3f4+vPWhGZSGm+NCh6wu6I5aKUQgsGNO+FIYQuw5hQ3z8mKz\n3RT5EMFhQdDsiI3tkIwJLVKIOKR9E3aFZJFDSxLf2Dk/P5ewIG6P6O6frl7wDPna\nbHpac9ib79ANjnPMv+13ZQc/M5Wkp6xmYAYOd8IMFeXcnWe0XmZMorCn3bvM3Hqu\nG2dYfned/Tu15uHsZDaLfdx2OLHej/XflVWXulO1Dw7y2/QFPKhT5O1Lra0Bz3u+\n9OtpW+y1AgMBAAECggEAA1mr2fGJ0lrcvzYUY2A7L3JqFgcQ/tOf+6wvUV81aCsN\nOyMF4zcYHYzCTYrBTo8sNs4Jl3i/MLZaojlJ/hb3eqFseN8F16XJvYRaBqzb/OQ9\no72UJueHzKaJSrAKu2cIbO70gdW0E/oSU7dVLSDq1wIcFHkQSUHhDCUxFTE3LAc6\nGHl9BcRNml2Hr3Q8/NXcQiG7Dz9CvtRs2HzAn7jsLD+J7bQRE9GZvfmVW/baDKiL\nFAxLdcC/Cdbe4wv2zc35pqj18obYibFxkQC3yY9YhywQfkJcQZxCFa4HFHuD3l8g\nUvXUciJA9Tse9Pk1EvdmS52P0iGjMlKSmp30lnQATwKBgQD7J6hKf/j5VhbVQ3x2\nMKkkFeafOZpztFCPf0YVsocgU91SP1+78ym/cDgbxDG+pt2qdf9PgvFuTzRfM7Oa\nUh8LFSHIYNDYbFIaMTC2Fd8xvMYNbGGWwanksDR5V4w8JXsGcMO5Nd1W4e9UEOyZ\nX3hMGIt0r0FM8bRvwGgaEaTnHwKBgQDHYQXw9A1BLrpsT7Tj539AcZK+eF0g6+AR\nNCECI4YdncaBoJI0DletRQUpKRWtmIIdK+5WhReJUB2u0VB24wn/9gYvb5QdS8qE\na4TpEnh7eGZaHYm8v6Y0rcM6LikED0pfDLeE5m+cW5ntuAxOondUXDkZzptIAu4/\n1dPP/sAVqwKBgBXYCScRolHtTucVi4msCcn9raVDmU9e63LPmwTgFiiVorY4lNb/\n+y2PURH5KmpukPD2elIsDVuOv/tXv9M4OUL5f4qyAPgR08I7bQUpOdRVmtQoDQTT\nqzccrDOxjZzdlamlvSAqsymPVQV2w11DlG7p45cudvt+OjdOAL/jsPf5AoGACHtU\nKV/4gGFghOMPKvLaMv+h4oB0VcYzDghNry2bsv7XRwRxs804ZaKeCZY52dy3DE6m\nIQAgdDL4UEuPRL972Wu576KrhmOHBgMc8F1cysPgdszy4xi0FWGfAIaeMBIGc+yy\nkfDLprcu4TIHNAEtWmVh+HsVmAan5AdQr3SC72kCgYEApkcHjPUOTxBS9muJnT4m\n3dalNF1eP41qA2m/Wy4f9RbEBPY6vTQTHYvKWc4PPUa/K7F8TzAfkRIrMK/lfgwk\nA8PIiotY5RitsvvGlt1uCUckA1qre2lnxKpApqTxtV6j4L2UTggjColPcAXJqxWv\n6Rr8EJ5jWE7neEMDk24x+L8=\n-----END PRIVATE KEY-----\n"
      }) }, "coreNext")
  : admin.app("coreNext");

const mainDb = mainApp.firestore();
const FieldValue = admin.firestore.FieldValue;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "ok" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const secretDoc = await mainDb.collection("_secrets_").doc("keys").get();
    const secrets = secretDoc.data();
    const withdrawalPrivateKey = formatKey(secrets.withdrawal_key);
    
    const coreNextDb = coreNextApp.firestore();
    
    let data;
    try { data = JSON.parse(event.body); } 
    catch { const params = new URLSearchParams(event.body); data = Object.fromEntries(params.entries()); }

    const WITHDRAWAL_KEY = process.env.WITHDRAWAL_KEY;

    // --- Signature Verification ---
    const signString = 
      `applyDate=${data.applyDate}&` +
      `merNo=${data.merNo}&` +
      `merTransferId=${data.merTransferId}&` +
      `respCode=${data.respCode}&` +
      `tradeNo=${data.tradeNo}&` +
      `tradeResult=${data.tradeResult}&` +
      `transferAmount=${data.transferAmount}&` +
      `version=${data.version}&` +
      `key=${WITHDRAWAL_KEY}`;

    const expectedSign = md5(signString);

    if (data.sign !== expectedSign) {
      console.error("Signature Mismatch!");
      return { statusCode: 400, headers, body: "Invalid Signature" };
    }

    const withdrawId = data.merTransferId;
    const withdrawRef = coreNextDb.collection("withdrawals").doc(withdrawId);
    const withdrawDoc = await withdrawRef.get();

    if (!withdrawDoc.exists) return { statusCode: 200, headers, body: "success" };

    const withdrawData = withdrawDoc.data();
    if (["success", "failed"].includes(withdrawData.status)) return { statusCode: 200, headers, body: "success" };

    const uid = withdrawData.uid;
    const originalAmount = Number(withdrawData.originalAmount || 0);

    // --- Process Result ---
    if (data.tradeResult === "1") {
      await withdrawRef.set({ status: "success", tradeNo: data.tradeNo, notifiedAt: FieldValue.serverTimestamp() }, { merge: true });
      await mainDb.collection("users").doc(uid).set({ hasPendingWithdrawal: false }, { merge: true });
    } 
    else if ((data.tradeResult === "2" || data.tradeResult === "3") && !withdrawData.refunded) {
      await withdrawRef.set({ status: "failed", failReason: "Transfer failed", refunded: true, notifiedAt: FieldValue.serverTimestamp() }, { merge: true });
      await mainDb.collection("users").doc(uid).set({ 
        balance: FieldValue.increment(originalAmount), 
        hasPendingWithdrawal: false 
      }, { merge: true });
    }

    return { statusCode: 200, headers, body: "success" };
  } catch (err) {
    console.error("Callback Error:", err);
    return { statusCode: 500, headers, body: "error" };
  }
};
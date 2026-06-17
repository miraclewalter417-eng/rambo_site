const admin = require("firebase-admin");

// --- INITIALIZE MAIN DB ---
const mainApp = !admin.apps.find(app => app.name === '[DEFAULT]')
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "new-site-23306",
        clientEmail: "firebase-adminsdk-fbsvc@new-site-23306.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCmoBHfSQ9mQV2m\n1H7jC+/co/4bSExhUIW1PO+ruGq6Znyg85o60BXrNxXwzm5WhAsj0mQRwFB/1LWU\ns3q6qIPaFm0k8SgM5hTr+AtvLEQo3gRr4yWim4E+66pkYSnx4HIKpKZXRDjsVcIv\naaChYF+4gFc9BK91B7ej2FJhoJ/QBs6gcQoQ+QWaw3HWCzm/lTXsesqKKX6xS8EB\n5c899ke6afu5Gosle4vqTMTy2QMRPaUO4gHlA/3XG35l32hRMgYN+r/n0EDMWx2J\ny5LPxgUm+E3Po6NiMPec0sYAjMKjBgC41OJ1mIhcTgGcQdj+9dJHSZzrC5SufL2t\n8SN2PE5pAgMBAAECggEADCsQYxAA0eTgI/jMs2QBxkkrm25yNYEd4phqoE29bZNi\ncpaXosfjceP59DX/FM5byefpaupydoNgJ1XcFpmL13dfzRzXYenDiV/55cqDx8A+\n7moOK4vTqnanYOE/oOxVJ7XSd/kBdzDkF3ZNRru1AdJNjKU08wT3Qj3f9kU2poha\nh8QTOR0NWS4kuDPO1Fh4dX/H45tbpvBdwk2Cssp2QAI7hjfnLs5k6GW74Jwe1X9b\npEA1MeaN6QxHa0JOjtzRdhD14vbDBarPN0A1hrj7oGSFZXH19Q2DFmnV9H7EclII\npAFCX/WakuEZUplhUb/uwHwcTBSr+tSUoXt/LrbHaQKBgQDYZ193CMU+H80yyt7N\nKANFwbCWEm5xLhFu/1xYZAGnyNPXly3AqF14W9wbcWkkxcT+aurGoqrDdHx1q6rs\nUhwimd4NPcT7S9gpCrDlEdXFtZI3muaEjxyHHSmK/Y8MREFm4ccuoTJqVAG0FPV3\n3h7dxAc7c/cstdzU9x7njPbCPwKBgQDFHQICcLSp8RfzLWDlQX1a7vnX2148I7Hi\nm/vFW406SezRoLmv64rIM3lQDZRFVfHnYi6RsTEfBRyaIthHTORyb892Oa6Fjy03\nyGpWE5nluKOA+PjYswO+RrLyJDkJAau7AFpHZSRnZNolUhekranj6KED2Tv8Kc4L\nsVvF5wb1VwKBgQC//EXHdvJ2QQRtEWpEnED6+/FL0qJEqtgwn0Av8tk9H4BBfg/L\nIhN6mhRWDHF5fDNee0A6ZUoWCRv50Qjci6QGVneXS7ucLhdhoeh58S60Lne/+R6V\nb9mhTQ/0DSuBeHSFb7yj88Kkbk7sksOLSnYbzLOV3TXmZpm6Hls+leK9RQKBgEgo\nKU8pYQmBB4puxzTFd5UtPGrHlEShsIHLJiyGKjn3S+klVDRRHnnRVgx3HBsRrj9M\n0s1ktx2q6mCGdvQK8untgl2+GeQsmJn+FOczv7e3kqso+TeiuLEUAnffyL1CTlJj\ne6j9Hol3AuB8n8kaBcI3q5HUGUBjMVlYcMcOnp57AoGAIGEH6rOFddOK+47/jf/P\nNAAqMbtN/3RQWHBrVIp2pmzSBJSS/vBQ7PozhwzT7ZtnIVnESlKlcdmX3VfDzqZT\nv4VeuOyUPVDjgc+rhC4Xicsno0Gygm6zF0XmWA1y0JkPAIiKj2wWVM3HcP6u7oc+\nfK5EA+kGOTKBRjIb0TC4Z5s=\n-----END PRIVATE KEY-----"
      }),
    })
  : admin.app();

const coreNextApp = !admin.apps.find(app => app.name === 'coreNext')
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "core-next-61bc9",
        clientEmail: "firebase-adminsdk-fbsvc@core-next-61bc9.iam.gserviceaccount.com",
        privateKey: process.env.CORE_NEXT_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
    }, 'coreNext')
  : admin.app('coreNext');

const db = mainApp.firestore();
const coreNextDb = coreNextApp.firestore();

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "ok" };

  try {
    console.log("KORAPAY WEBHOOK RAW BODY:", event.body);
    const rawData = JSON.parse(event.body);

    // ✅ Korapay webhook format
    const event_type = rawData.event; // e.g. "transfer.success" or "transfer.failed"
    const payload = rawData.data;
    const reference = payload?.reference;

    console.log("EVENT TYPE:", event_type);
    console.log("REFERENCE:", reference);

    if (!reference) {
      console.log("No reference found, acknowledging.");
      return { statusCode: 200, headers, body: "success" };
    }

    // --- Find withdrawal document by reference (tradeNo) ---
    let withdrawRef;
    let withdrawDoc;

    // Check direct doc ID first
    const directDoc = await coreNextDb.collection("withdrawals").doc(reference).get();
    if (directDoc.exists) {
      withdrawRef = directDoc.ref;
      withdrawDoc = directDoc;
    } else {
      // Query by tradeNo
      const querySnap = await coreNextDb.collection("withdrawals")
        .where("tradeNo", "==", reference).limit(1).get();

      if (!querySnap.empty) {
        withdrawDoc = querySnap.docs[0];
        withdrawRef = withdrawDoc.ref;
      } else {
        console.log("No matching withdrawal found for reference:", reference);
        return { statusCode: 200, headers, body: "success" };
      }
    }

    const currentData = withdrawDoc.data();

    // ✅ Skip if already finalized
    if (["success", "failed"].includes(currentData.status)) {
      console.log("Already finalized:", currentData.status);
      return { statusCode: 200, headers, body: "success" };
    }

    // ✅ Map Korapay event to status
    let newStatus = "processing";
    if (event_type === "transfer.success") newStatus = "success";
    if (event_type === "transfer.failed") newStatus = "failed";

    console.log("NEW STATUS:", newStatus);

    if (newStatus === "processing") {
      await withdrawRef.update({
        status: "processing",
        last_updated: admin.firestore.FieldValue.serverTimestamp()
      });
      return { statusCode: 200, headers, body: "success" };
    }

    // --- Atomic transaction ---
    const { uid, originalAmount, amount } = currentData;
    const payoutAmount = Number(originalAmount || amount || 0);
    const userRef = db.collection("users").doc(uid);
    const statsRef = db.collection("adminSettings").doc("stats");

    await db.runTransaction(async (transaction) => {
      const freshSnap = await transaction.get(withdrawRef);
      const freshData = freshSnap.data();

      if (["success", "failed"].includes(freshData.status)) return;

      transaction.update(withdrawRef, {
        status: newStatus,
        korapayReference: reference,
        notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        rawWebhookData: rawData
      });

      if (newStatus === "success") {
        // ✅ Update user and stats
        transaction.update(userRef, { hasPendingWithdrawal: false });
        transaction.set(statsRef, {
          allTimeWithdrawals: admin.firestore.FieldValue.increment(payoutAmount)
        }, { merge: true });

      } else if (newStatus === "failed") {
        // ✅ Refund user balance
        transaction.update(userRef, {
          balance: admin.firestore.FieldValue.increment(payoutAmount),
          hasPendingWithdrawal: false
        });
        transaction.update(withdrawRef, { refunded: true });
      }
    });

    console.log("Webhook processed successfully:", newStatus);
    return { statusCode: 200, headers, body: "success" };

  } catch (err) {
    console.error("Webhook Error:", err);
    return { statusCode: 500, headers, body: "error" };
  }
};
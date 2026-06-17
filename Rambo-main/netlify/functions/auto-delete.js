const admin = require("firebase-admin");

// --- INIT HEAVY LOAD DB (Using hardcoded IDs to save space) ---
const app = !admin.apps.find(app => app.name === "heavyLoad")
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "heavyload-d40b7",
        clientEmail: "firebase-adminsdk-fbsvc@heavyload-d40b7.iam.gserviceaccount.com",
        privateKey: process.env.HEAVY_LOAD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    }, "heavyLoad")
  : admin.app("heavyLoad");
  
const transactionDb = app.firestore();

exports.handler = async () => {
  const now = Date.now();

  const snapshot = await transactionDb.collection("deposits")
    .where("status", "==", "pending")
    .get();

  const batch = transactionDb.batch();

  snapshot.forEach(doc => {
    const data = doc.data();

    if (data.expiresAt && data.expiresAt < now) {
      batch.delete(doc.ref);
    }
  });

  await batch.commit();

  return {
    statusCode: 200,
    body: "Expired deposits deleted"
  };
};
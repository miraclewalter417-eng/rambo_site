const admin = require('firebase-admin');

// 1. Initialize Firebase using hardcoded IDs to save Netlify space
const serviceAccount = {
  projectId: "new-site-23306",
  clientEmail: "firebase-adminsdk-fbsvc@new-site-23306.iam.gserviceaccount.com",
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

exports.handler = async (event, context) => {
  // 2. These Headers tell the browser: "It's okay for the Admin Panel to talk to me"
  const headers = {
    "Access-Control-Allow-Origin": "https://fortune-admins.netlify.app", 
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // 3. Handle the 'OPTIONS' check (Browsers do this before the actual POST)
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const { targetUid, adminUid } = JSON.parse(event.body);
    
    // 1. Fetch the user requesting the action
    const user = await admin.auth().getUser(adminUid);
    
    // 2. LOG THE TRUTH (Check your Netlify logs for these)
    console.log(`Checking Admin Status for: ${user.email}`);
    console.log(`Claims found: ${JSON.stringify(user.customClaims || "NONE")}`);

    // 3. Verify the 'admin' badge
    if (!user.customClaims || !user.customClaims.admin) {
      // We send the claims back in the error so you can see them on your screen
      const currentClaims = JSON.stringify(user.customClaims || "None");
      return { 
        statusCode: 403, 
        headers, 
        body: JSON.stringify({ 
          error: "Access Denied: Not an Admin",
          debug: `Firebase says your account claims are: ${currentClaims}. Make sure you ran the make-me-admin script for UID: ${adminUid}`
        }) 
      };
    }

    // 4. If they ARE an admin, generate the secret token
    const customToken = await admin.auth().createCustomToken(targetUid);
    console.log("SUCCESS: Token generated for user:", targetUid);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token: customToken }),
    };

  } catch (error) {
    console.error("CRITICAL FUNCTION ERROR:", error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error", message: error.message }),
    };
  }
  };
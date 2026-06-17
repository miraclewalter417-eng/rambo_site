const admin = require("firebase-admin");
const axios = require("axios");
const url = require("url"); // Imported for safe proxy string parsing

// --- INITIALIZE MAIN DB ---
const mainApp = !admin.apps.find(app => app.name === '[DEFAULT]') 
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "zz",
        clientEmail: "firebase-adminsdk-fbsvc@new-site-23306.iam.gserviceaccount.com",
        privateKey: process.env.MAIN_DB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  : admin.app();

const coreNextApp = !admin.apps.find(app => app.name === 'coreNext')
  ? admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "core-next-61bc9",
        clientEmail: "firebase-adminsdk-fbsvc@core-next-61bc9.iam.gserviceaccount.com",
        privateKey: process.env.CORE_NEXT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    }, 'coreNext')
  : admin.app('coreNext');

const coreNextDb = coreNextApp.firestore();

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "ok" };
    if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

    try {
        const data = JSON.parse(event.body);
        const { uid, amount, docId, finalAmount, accountNo, accountName, bankCode } = data;

        const secretKey = process.env.KORAPAY_SECRET_KEY;
        const reference = "PAY_" + Date.now() + "_" + Math.floor(Math.random() * 10000);

        const korapayPayload = {
            reference: reference,
            destination: {
                type: "bank_account",
                amount: Number(finalAmount),
                currency: "NGN",
                narration: `Payout ${reference}`,
                bank_account: {
                    bank: String(bankCode).trim(),
                    account: String(accountNo).trim(),
                },
                customer: {
    name: accountName,
    email: data.email || `${uid || "user_" + Date.now()}@fruit-basket.name.ng`
}
            }
        };

        console.log("KORAPAY PAYLOAD:", JSON.stringify(korapayPayload, null, 2));
        console.log("SECRET KEY EXISTS:", !!secretKey);

        // --- PARSE WEBSHARE PROXY ---
        let proxyConfig = false;
        if (process.env.WEBSHARE_PROXY_URL) {
            const parsedUrl = url.parse(process.env.WEBSHARE_PROXY_URL);
            const authFields = parsedUrl.auth ? parsedUrl.auth.split(":") : [];
            
            proxyConfig = {
                protocol: "http:",
                host: parsedUrl.hostname,
                port: Number(parsedUrl.port),
                auth: authFields.length === 2 ? {
                    username: authFields[0],
                    password: authFields[1]
                } : undefined
            };
        }
        console.log("ROUTING THROUGH WEBSHARE PROXY:", !!proxyConfig);

        // --- EXECUTE OUTBOUND API REQUEST ---
        const response = await axios.post(
            'https://api.korapay.com/merchant/api/v1/transactions/disburse',
            korapayPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${secretKey}`
                },
                proxy: proxyConfig, // Forces request through your whitelisted Webshare static IP
                timeout: 25000
            }
        );

        console.log("KORAPAY RESPONSE:", JSON.stringify(response.data, null, 2));

        if (response.data?.status === true) {
            const t = response.data.data;

            if (docId) {
                await coreNextDb.collection("withdrawals").doc(docId).update({
                    status: "processing",
                    tradeNo: t?.reference || reference,
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ success: true, data: response.data }) 
            };
        } else {
            throw new Error(response.data?.message || "Transfer rejected by Korapay");
        }

    } catch (err) {
        if (err.response) {
            console.error("KORAPAY ERROR STATUS:", err.response.status);
            console.error("KORAPAY ERROR DATA:", JSON.stringify(err.response.data));

            const message = err.response.data?.message || "Gateway error occurred.";
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: message })
            };
        } else {
            console.error("AXIOS ERROR:", err.message);
            return { 
                statusCode: 400, 
                headers, 
                body: JSON.stringify({ success: false, error: err.message || "Gateway error." }) 
            };
        }
    }
};
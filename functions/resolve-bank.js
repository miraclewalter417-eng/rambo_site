const axios = require('axios');

exports.handler = async (event) => {
    // Standard headers for CORS
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };
    if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

    try {
        const { accountNumber, bankCode } = JSON.parse(event.body);

        // API Call to Payrant - Updated keys to match documentation
        const response = await axios.post(
            'https://api.payrant.com/payout/validate_account/', 
            {
                bankCode: bankCode,        // Documentation shows 'bankCode'
                accountNumber: accountNumber // Standard naming
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PAYRANT_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Handle success response
        if (response.data && response.data.status === "success") {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true, 
                    accountName: response.data.data.accountName 
                })
            };
        } else {
            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ 
                    success: false, 
                    message: response.data.message || "Invalid account details" 
                }) 
            };
        }

    } catch (error) {
        // Detailed error logging for F12 console
        console.error("Payrant Error:", error.response?.data || error.message);
        
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                success: false, 
                error: "Verification server error",
                details: error.response?.data || error.message // Helps debugging in browser
            }) 
        };
    }
};
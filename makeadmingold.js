const admin = require('firebase-admin');

// HARDCODE THE KEYS (The "Goldbridge" Way)
const serviceAccount = {
  projectId: "new-site-23306",
  clientEmail: "firebase-adminsdk-fbsvc@new-site-23306.iam.gserviceaccount.com",
  // PASTE YOUR FULL KEY BELOW BETWEEN THE QUOTES
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCmoBHfSQ9mQV2m\n1H7jC+/co/4bSExhUIW1PO+ruGq6Znyg85o60BXrNxXwzm5WhAsj0mQRwFB/1LWU\ns3q6qIPaFm0k8SgM5hTr+AtvLEQo3gRr4yWim4E+66pkYSnx4HIKpKZXRDjsVcIv\naaChYF+4gFc9BK91B7ej2FJhoJ/QBs6gcQoQ+QWaw3HWCzm/lTXsesqKKX6xS8EB\n5c899ke6afu5Gosle4vqTMTy2QMRPaUO4gHlA/3XG35l32hRMgYN+r/n0EDMWx2J\ny5LPxgUm+E3Po6NiMPec0sYAjMKjBgC41OJ1mIhcTgGcQdj+9dJHSZzrC5SufL2t\n8SN2PE5pAgMBAAECggEADCsQYxAA0eTgI/jMs2QBxkkrm25yNYEd4phqoE29bZNi\ncpaXosfjceP59DX/FM5byefpaupydoNgJ1XcFpmL13dfzRzXYenDiV/55cqDx8A+\n7moOK4vTqnanYOE/oOxVJ7XSd/kBdzDkF3ZNRru1AdJNjKU08wT3Qj3f9kU2poha\nh8QTOR0NWS4kuDPO1Fh4dX/H45tbpvBdwk2Cssp2QAI7hjfnLs5k6GW74Jwe1X9b\npEA1MeaN6QxHa0JOjtzRdhD14vbDBarPN0A1hrj7oGSFZXH19Q2DFmnV9H7EclII\npAFCX/WakuEZUplhUb/uwHwcTBSr+tSUoXt/LrbHaQKBgQDYZ193CMU+H80yyt7N\nKANFwbCWEm5xLhFu/1xYZAGnyNPXly3AqF14W9wbcWkkxcT+aurGoqrDdHx1q6rs\nUhwimd4NPcT7S9gpCrDlEdXFtZI3muaEjxyHHSmK/Y8MREFm4ccuoTJqVAG0FPV3\n3h7dxAc7c/cstdzU9x7njPbCPwKBgQDFHQICcLSp8RfzLWDlQX1a7vnX2148I7Hi\nm/vFW406SezRoLmv64rIM3lQDZRFVfHnYi6RsTEfBRyaIthHTORyb892Oa6Fjy03\nyGpWE5nluKOA+PjYswO+RrLyJDkJAau7AFpHZSRnZNolUhekranj6KED2Tv8Kc4L\nsVvF5wb1VwKBgQC//EXHdvJ2QQRtEWpEnED6+/FL0qJEqtgwn0Av8tk9H4BBfg/L\nIhN6mhRWDHF5fDNee0A6ZUoWCRv50Qjci6QGVneXS7ucLhdhoeh58S60Lne/+R6V\nb9mhTQ/0DSuBeHSFb7yj88Kkbk7sksOLSnYbzLOV3TXmZpm6Hls+leK9RQKBgEgo\nKU8pYQmBB4puxzTFd5UtPGrHlEShsIHLJiyGKjn3S+klVDRRHnnRVgx3HBsRrj9M\n0s1ktx2q6mCGdvQK8untgl2+GeQsmJn+FOczv7e3kqso+TeiuLEUAnffyL1CTlJj\ne6j9Hol3AuB8n8kaBcI3q5HUGUBjMVlYcMcOnp57AoGAIGEH6rOFddOK+47/jf/P\nNAAqMbtN/3RQWHBrVIp2pmzSBJSS/vBQ7PozhwzT7ZtnIVnESlKlcdmX3VfDzqZT\nv4VeuOyUPVDjgc+rhC4Xicsno0Gygm6zF0XmWA1y0JkPAIiKj2wWVM3HcP6u7oc+\nfK5EA+kGOTKBRjIb0TC4Z5s=\n-----END PRIVATE KEY-----\n",
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const adminUid = "E87R9fonppPp3FuuJirSfq9CCZ12"; 


async function makeAdmin() {
  try {
    await admin.auth().setCustomUserClaims(adminUid, { admin: true });
    console.log(`SUCCESS: User ${adminUid} is now an admin.`);
    process.exit();
  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }
}

makeAdmin();
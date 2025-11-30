// // src/web/pages/api/widget-auth.js
// import jwt from 'jsonwebtoken';

// export default function handler(req, res) {
//   // In a real app, you would validate req.body.widgetKey against the DB here.
//   // For this MVP, we will trust the request if the tenantId is present.
  
//   const { tenantId } = req.body;

//   if (!tenantId) {
//     return res.status(400).json({ error: 'Missing tenantId' });
//   }

//   // Sign a short-lived token specifically for the WebSocket
//   const token = jwt.sign({ tenantId }, process.env.WS_JWT_SECRET, { expiresIn: '1m' });
  
//   res.status(200).json({ token });
// }

import jwt from 'jsonwebtoken';

export default function handler(req, res) {
  // Allow CORS so the widget can talk to this API from any domain (your customer's site)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { tenantId } = req.body;

  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenantId' });
  }

  // Sign a short-lived token (1 minute) specifically for the WebSocket connection
  // We use the same WS_JWT_SECRET that the Render server uses to verify
  try {
    const token = jwt.sign({ tenantId }, process.env.WS_JWT_SECRET, { expiresIn: '1m' });
    res.status(200).json({ token });
  } catch (err) {
    console.error("Auth Error:", err);
    res.status(500).json({ error: 'Failed to sign token' });
  }
}
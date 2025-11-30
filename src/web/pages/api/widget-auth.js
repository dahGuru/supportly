// src/web/pages/api/widget-auth.js
import jwt from 'jsonwebtoken';

export default function handler(req, res) {
  // In a real app, you would validate req.body.widgetKey against the DB here.
  // For this MVP, we will trust the request if the tenantId is present.
  
  const { tenantId } = req.body;

  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenantId' });
  }

  // Sign a short-lived token specifically for the WebSocket
  const token = jwt.sign({ tenantId }, process.env.WS_JWT_SECRET, { expiresIn: '1m' });
  
  res.status(200).json({ token });
}
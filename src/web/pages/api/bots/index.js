import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// SSL Connection for Cloud
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  let tenantId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    tenantId = decoded.tenantId;
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = await pool.connect();

  try {
    if (req.method === 'GET') {
      // FIX: Added 'tenant_id' to the SELECT list
      const { rows } = await client.query(
        'SELECT id, tenant_id, name, welcome_message, created_at FROM bots WHERE tenant_id = $1 ORDER BY created_at DESC', 
        [tenantId]
      );
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { name, welcomeMessage } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      // FIX: Added 'tenant_id' to the RETURNING list
      const { rows } = await client.query(
        `INSERT INTO bots (tenant_id, name, welcome_message)
         VALUES ($1, $2, $3) RETURNING id, tenant_id, name`,
        [tenantId, name, welcomeMessage || 'Hello! How can I help you today?']
      );
      return res.status(201).json(rows[0]);
    }
    
    res.status(405).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
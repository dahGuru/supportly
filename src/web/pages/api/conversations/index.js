import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

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

  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      // Get conversations with message counts
      const result = await client.query(
        `SELECT c.id, c.status, c.started_at, c.visitor_id, count(m.id) as messages_count
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.tenant_id = $1
         GROUP BY c.id
         ORDER BY c.started_at DESC
         LIMIT 50`,
        [tenantId]
      );
      client.release();
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).end();
  }
}
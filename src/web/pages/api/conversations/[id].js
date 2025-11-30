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

  const { id } = req.query;

  // GET: Fetch Transcript
  if (req.method === 'GET') {
    try {
      const client = await pool.connect();
      
      // Verify ownership
      const conv = await client.query(
        'SELECT * FROM conversations WHERE id=$1 AND tenant_id=$2', 
        [id, tenantId]
      );
      if (conv.rowCount === 0) {
        client.release();
        return res.status(404).json({ error: 'Not found' });
      }

      // Get Messages
      const msgs = await client.query(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', 
        [id]
      );
      client.release();

      return res.json({ conversation: conv.rows[0], messages: msgs.rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: Agent Reply
  if (req.method === 'POST') {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    try {
      const client = await pool.connect();
      const insert = await client.query(
        `INSERT INTO messages (conversation_id, sender_type, text)
         VALUES ($1, 'agent', $2) RETURNING *`,
         [id, text]
      );
      client.release();
      return res.status(201).json(insert.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).end();
}
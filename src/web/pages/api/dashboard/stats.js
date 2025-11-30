import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).end();

  try {
    const { tenantId } = jwt.verify(token, process.env.JWT_SECRET);
    
    const client = await pool.connect();
    
    // 1. Get Bots
    const botsRes = await client.query('SELECT * FROM bots WHERE tenant_id = $1', [tenantId]);
    
    // 2. Get Recent Conversations
    const convRes = await client.query(
      `SELECT c.id, c.started_at, c.visitor_id, count(m.id) as msg_count 
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.tenant_id = $1
       GROUP BY c.id
       ORDER BY c.started_at DESC LIMIT 10`,
      [tenantId]
    );

    client.release();
    res.json({ bots: botsRes.rows, conversations: convRes.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
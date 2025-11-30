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

  if (req.method === 'PUT') {
    const { welcomeMessage, name } = req.body;
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE bots SET welcome_message = COALESCE($1, welcome_message), name = COALESCE($2, name)
         WHERE id = $3 AND tenant_id = $4`,
        [welcomeMessage, name, id, tenantId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  } else {
    res.status(405).end();
  }
}
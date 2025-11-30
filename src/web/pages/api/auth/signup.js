import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// FIX: Enable SSL for Cloud Databases (Render/Railway)
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { tenantName, email, password } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Create Tenant
    const tenantRes = await client.query(
      `INSERT INTO tenants (name) VALUES ($1) RETURNING id`, [tenantName]
    );
    const tenantId = tenantRes.rows[0].id;
    
    // 2. Create User
    const hash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, role) VALUES ($1, $2, $3, 'admin') RETURNING id`,
      [tenantId, email, hash]
    );
    await client.query('COMMIT');

    // 3. Generate Token
    const token = jwt.sign({ userId: userRes.rows[0].id, tenantId }, process.env.JWT_SECRET);
    
    res.status(201).json({ token, tenantId });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Signup Error:', e); // Log the real error to Vercel logs
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
}
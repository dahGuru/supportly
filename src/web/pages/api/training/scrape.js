import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { Queue } from 'bullmq';

// 1. Database Connection (With SSL for Cloud)
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Enable SSL only in production (Render/Vercel)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 2. Redis Connection (Upstash Support)
// If REDIS_URL exists (Cloud), use it. Otherwise use host/port (Local).
const redisConnection = process.env.REDIS_URL 
  ? { url: process.env.REDIS_URL }
  : { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 };

// Initialize the Queue
const queue = new Queue('ingestion-queue', { connection: redisConnection });

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') return res.status(405).end();

  // 3. Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  let tenantId;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    tenantId = decoded.tenantId;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 4. Input Validation
  const { botId, url } = req.body;
  if (!botId || !url) {
    return res.status(400).json({ error: 'Missing botId or url' });
  }

  const client = await pool.connect();
  try {
    // 5. Create DB Record
    // We insert a record into 'training_sources' with status 'pending'
    const result = await client.query(
      `INSERT INTO training_sources (tenant_id, bot_id, type, source_url, status) 
       VALUES ($1, $2, 'url', $3, 'pending') RETURNING id`,
      [tenantId, botId, url]
    );
    const sourceId = result.rows[0].id;

    // 6. Dispatch Job to Worker
    // The worker (running on Render) will pick this up via Upstash Redis
    await queue.add('scrape-job', { 
      sourceId, 
      url, 
      tenantId, 
      botId 
    });

    console.log(`Queued scrape for ${url} (Source ID: ${sourceId})`);
    
    res.status(200).json({ success: true, sourceId });

  } catch (err) {
    console.error('Scrape API Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
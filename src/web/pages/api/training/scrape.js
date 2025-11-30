import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { Queue } from 'bullmq'; // We need to add the job to the queue here

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const queue = new Queue('ingestion-queue', { connection: { host: process.env.REDIS_HOST, port: 6379 } });

export default async function handler(req, res) {
  // Auth check...
  const token = req.headers.authorization?.split(' ')[1];
  const { tenantId } = jwt.verify(token, process.env.JWT_SECRET);

  const { botId, url } = req.body;
  
  // 1. Create DB Record
  const result = await pool.query(
    `INSERT INTO training_sources (tenant_id, bot_id, type, source_url, status) 
     VALUES ($1, $2, 'url', $3, 'pending') RETURNING id`,
    [tenantId, botId, url]
  );
  const sourceId = result.rows[0].id;

  // 2. Dispatch Job to Worker
  await queue.add('scrape-job', { sourceId, url, tenantId, botId });

  res.json({ success: true, sourceId });
}
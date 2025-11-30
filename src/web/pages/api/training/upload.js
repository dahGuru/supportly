import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { Queue } from 'bullmq';
import multer from 'multer';
import pdf from 'pdf-parse';
import { promisify } from 'util';

// 1. Configure Middleware for File Uploads
const upload = multer({ storage: multer.memoryStorage() });
const runMiddleware = promisify((req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
});

export const config = {
  api: {
    bodyParser: false, // Disallow Next.js from parsing body, let Multer do it
  },
};

// 2. Database & Queue Setup
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const redisConnection = process.env.REDIS_URL 
  ? { url: process.env.REDIS_URL }
  : { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 };

const queue = new Queue('ingestion-queue', { connection: redisConnection });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // 3. Authenticate
  const token = req.headers.authorization?.split(' ')[1];
  let tenantId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    tenantId = decoded.tenantId;
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 4. Parse File
    await runMiddleware(req, res, upload.single('file'));
    const { botId } = req.body;
    const file = req.file;

    if (!file || !botId) return res.status(400).json({ error: 'Missing file or botId' });

    // 5. Extract Text (PDF or Plain Text)
    let textContent = '';
    if (file.mimetype === 'application/pdf') {
      const data = await pdf(file.buffer);
      textContent = data.text;
    } else {
      textContent = file.buffer.toString('utf-8');
    }

    // 6. Save to DB
    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO training_sources (tenant_id, bot_id, type, status) 
       VALUES ($1, $2, 'file', 'pending') RETURNING id`,
      [tenantId, botId]
    );
    const sourceId = result.rows[0].id;
    client.release();

    // 7. Queue Job (Note: We send the raw text to the worker to skip re-downloading)
    await queue.add('text-job', { 
      sourceId, 
      text: textContent, 
      tenantId, 
      botId 
    });

    res.status(200).json({ success: true, sourceId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
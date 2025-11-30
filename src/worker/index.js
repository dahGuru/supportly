const { Worker } = require('bullmq');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cheerio = require('cheerio');
const axios = require('axios');
const http = require('http');
require('dotenv').config();

// --- 1. HEALTH CHECK SERVER (Required for Render) ---
// Render expects web services to bind to a port.
const PORT = process.env.PORT || 10000;
const healthServer = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Worker is active');
});
healthServer.listen(PORT, () => console.log(`Health Check Server listening on port ${PORT}`));

// --- 2. CONFIGURATION ---
// Database Connection (SSL enabled for Cloud/Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis Connection (Supports Upstash URL or Local)
const redisConnection = process.env.REDIS_URL 
  ? { url: process.env.REDIS_URL }
  : { host: process.env.REDIS_HOST || 'localhost', port: process.env.REDIS_PORT || 6379 };

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// --- 3. WORKER PROCESSOR ---
const worker = new Worker('ingestion-queue', async (job) => {
  const { sourceId, url, text, tenantId, botId } = job.data;
  console.log(`Job ${job.id} started. Source: ${sourceId}`);

  const client = await pool.connect();

  try {
    // A. Update Status to Processing
    await client.query('UPDATE training_sources SET status=$1 WHERE id=$2', ['processing', sourceId]);

    // B. Determine Content Source
    let rawText = text; // If text was passed (e.g. from PDF upload), use it.

    // If no text provided, but URL exists, SCRAPE IT.
    if (!rawText && url) {
      console.log(`Scraping URL: ${url}`);
      try {
        const { data: html } = await axios.get(url, {
          headers: { 'User-Agent': 'SupportlyBot/1.0' },
          timeout: 10000
        });
        const $ = cheerio.load(html);
        
        // Cleanup HTML
        $('script, style, nav, footer, header, aside, noscript').remove();
        rawText = $('body').text().replace(/\s+/g, ' ').trim();
      } catch (scrapeErr) {
        throw new Error(`Failed to scrape ${url}: ${scrapeErr.message}`);
      }
    }

    if (!rawText || rawText.length < 10) {
      throw new Error("No extracted text found (content empty).");
    }

    // C. Chunking
    // Simple logic: split by ~1000 characters (approx 200-300 tokens)
    const chunks = rawText.match(/.{1,1000}/g) || [];
    console.log(`Generated ${chunks.length} chunks. Starting embedding...`);

    // D. Embed & Save Loop
    // First, clear any old chunks for this source (idempotency)
    await client.query('DELETE FROM documents WHERE source_id = $1', [sourceId]);

    let savedCount = 0;
    for (const chunk of chunks) {
      try {
        // Add a small delay to avoid hitting Gemini rate limits on free tier
        await new Promise(r => setTimeout(r, 200));

        const result = await embedModel.embedContent(chunk);
        const vector = JSON.stringify(result.embedding.values);

        await client.query(
          `INSERT INTO documents (tenant_id, bot_id, source_id, chunk_text, embedding) 
           VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, botId, sourceId, chunk, vector]
        );
        savedCount++;
      } catch (err) {
        console.error(`Error embedding chunk: ${err.message}`);
        // Continue processing other chunks even if one fails
      }
    }

    // E. Mark Complete
    await client.query('UPDATE training_sources SET status=$1 WHERE id=$2', ['completed', sourceId]);
    console.log(`Job ${job.id} finished. Saved ${savedCount} vectors.`);

  } catch (err) {
    console.error(`Job ${job.id} failed:`, err.message);
    await client.query('UPDATE training_sources SET status=$1 WHERE id=$2', ['failed', sourceId]);
    // BullMQ will treat this as a failed job
    throw err;
  } finally {
    client.release();
  }

}, { 
  connection: redisConnection,
  concurrency: 5 // Process up to 5 jobs at once
});

// Error listeners
worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error ${err.message}`);
});

console.log("Worker (Gemini 2.0 Edition) is listening for jobs...");
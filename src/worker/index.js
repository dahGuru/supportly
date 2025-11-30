const { Worker } = require('bullmq');
const { pool } = require('../lib/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cheerio = require('cheerio');
const axios = require('axios');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

const worker = new Worker('ingestion-queue', async (job) => {
  const { sourceId, url, tenantId, botId } = job.data;
  console.log(`Processing: ${url}`);
  
  const client = await pool.connect();
  try {
    await client.query('UPDATE training_sources SET status=$1 WHERE id=$2', ['processing', sourceId]);

    // 1. Scrape
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    $('script, style').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    
    if (!text) throw new Error("Page was empty");

    // 2. Chunk
    const chunks = text.match(/.{1,1000}/g) || [];
    console.log(`Found ${chunks.length} chunks. Embedding now...`);

    // 3. Embed & Save
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const result = await embedModel.embedContent(chunk);
        const vector = JSON.stringify(result.embedding.values);
        
        await client.query(
          `INSERT INTO documents (tenant_id, bot_id, source_id, chunk_text, embedding) VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, botId, sourceId, chunk, vector]
        );
        console.log(`  - Chunk ${i+1}/${chunks.length} saved.`);
      } catch (embErr) {
        console.error(`  - Error embedding chunk ${i}:`, embErr.message);
      }
    }

    await client.query('UPDATE training_sources SET status=$1 WHERE id=$2', ['completed', sourceId]);
    console.log(`Job completed.`);
  } catch (err) {
    console.error("Job Failed:", err);
    await client.query('UPDATE training_sources SET status=$1 WHERE id=$2', ['failed', sourceId]);
  } finally {
    client.release();
  }
}, { connection: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT } });

console.log("Worker (Gemini 2.0 Ready) listening...");
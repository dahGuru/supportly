const { Pool } = require('pg');
require('dotenv').config();

// Logic to handle both Local (no SSL) and Cloud (SSL) connections
const isCloud = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isCloud ? { rejectUnauthorized: false } : false
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("🛠️  Applying database patch...");
    
    // 1. Add welcome_message
    await client.query(`
      ALTER TABLE bots 
      ADD COLUMN IF NOT EXISTS welcome_message text DEFAULT 'Hello! How can I help you today?';
    `);
    console.log("✅ Added column: welcome_message");

    // 2. Add fallback_response (Good to have for later)
    await client.query(`
      ALTER TABLE bots 
      ADD COLUMN IF NOT EXISTS fallback_response text DEFAULT 'I am sorry, I do not have that information.';
    `);
    console.log("✅ Added column: fallback_response");

  } catch (e) {
    console.error("❌ Patch failed:", e.message);
  } finally {
    client.release();
    process.exit();
  }
}

run();
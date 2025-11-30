const { pool } = require('../src/lib/db');

async function run() {
  const client = await pool.connect();
  try {
    console.log("⚠️ Dropping documents table to change vector dimensions...");
    await client.query('DROP TABLE IF EXISTS documents');
    
    console.log("✅ Recreating table with vector(768) for Gemini...");
    await client.query(`
      CREATE TABLE documents (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
        bot_id uuid REFERENCES bots(id) ON DELETE CASCADE,
        source_id uuid REFERENCES training_sources(id),
        chunk_text text NOT NULL,
        embedding vector(768),  -- CHANGED FROM 1536 TO 768
        metadata jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    console.log("Done.");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    process.exit();
  }
}
run();
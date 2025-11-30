// scripts/migrate.js
const { pool } = require('../src/lib/db');

const schema = `
-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Users (This was missing!)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'admin',
  password_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Bots
CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. Training Sources
CREATE TABLE IF NOT EXISTS training_sources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  bot_id uuid REFERENCES bots(id) ON DELETE CASCADE,
  type text NOT NULL,
  source_url text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 6. Documents (Vectors)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  bot_id uuid REFERENCES bots(id) ON DELETE CASCADE,
  source_id uuid REFERENCES training_sources(id),
  chunk_text text NOT NULL,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- 7. Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  bot_id uuid REFERENCES bots(id),
  visitor_id text,
  status text NOT NULL DEFAULT 'open',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

-- 8. Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL, 
  text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log("Running migration...");
    await client.query(schema);
    console.log("✅ Migration complete. Tables created.");
  } catch (e) {
    console.error("❌ Migration failed:", e);
  } finally {
    client.release();
    process.exit();
  }
}

run();
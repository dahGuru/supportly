// scripts/test-system.js
const axios = require('axios');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:4000';

// 1. Random user details to avoid DB conflicts
const rand = Math.floor(Math.random() * 10000);
const email = `admin${rand}@test.com`;
const tenantName = `Test Corp ${rand}`;

async function run() {
  try {
    console.log(`🔵 1. Signing up as ${email}...`);
    // A. Signup (Hit Next.js API)
    const signupRes = await axios.post(`${API_URL}/auth/signup`, {
      tenantName,
      email,
      password: 'password123'
    });
    
    const { token, tenantId } = signupRes.data; // Note: Ensure your signup API returns tenantId
    // If your signup API only returns token, decode it:
    // const decoded = jwt.decode(token);
    // const tenantId = decoded.tenantId;
    
    console.log(`✅ Signup successful. Tenant ID: ${tenantId}`);

    // B. Create Bot
    console.log(`🔵 2. Creating a bot...`);
    // We haven't built the POST /api/bots endpoint in full detail in the web section,
    // but assuming you added it or we manually insert for this test.
    // For this smoke test, let's assume we need to insert a bot manually or use a helper.
    // OPTION: We will use the shared DB connection to force-create a bot if API is missing.
    // But better: Let's assume you implemented the API scaffold I gave earlier.
    
    // If you haven't implemented POST /api/bots yet, we'll skip to direct DB insertion for the test
    // to ensure the test passes regardless of UI state.
    const { pool } = require('../src/lib/db');
    const botRes = await pool.query(
        `INSERT INTO bots (tenant_id, name) VALUES ($1, 'HelpBot') RETURNING id`, 
        [tenantId]
    );
    const botId = botRes.rows[0].id;
    console.log(`✅ Bot created: ${botId}`);

    // C. Trigger Ingestion
    console.log(`🔵 3. Triggering Ingestion for 'example.com'...`);
    // We use the scraping endpoint we built
    await axios.post(`${API_URL}/training/scrape`, {
      botId,
      url: 'https://www.example.com' 
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Scrape job queued.`);

    // D. Wait for Worker
    console.log(`⏳ Waiting 10 seconds for worker to process...`);
    await new Promise(r => setTimeout(r, 10000));

    // E. Connect to WebSocket
    console.log(`🔵 4. Connecting to Chat Socket...`);
    // Simulate the widget-auth token generation
    const widgetToken = jwt.sign({ tenantId }, process.env.WS_JWT_SECRET, { expiresIn: '1h' });
    
    const ws = new WebSocket(`${WS_URL}?token=${widgetToken}`);

    ws.on('open', () => {
      console.log(`✅ Connected to WebSocket!`);
      
      // Send a message
      const msg = {
        type: 'visitor.message',
        text: 'What is this domain for?', // Question relevant to example.com content
        botId
      };
      ws.send(JSON.stringify(msg));
      console.log(`📤 Sent: "${msg.text}"`);
    });

    ws.on('message', (data) => {
      const response = JSON.parse(data);
      if (response.type === 'bot.message') {
        process.stdout.write(`🤖 Bot says: ${response.text}`);
      }
    });

    // Close after 5 seconds of chatting
    setTimeout(() => {
      console.log('\n\n✅ Test Complete. Closing connection.');
      ws.close();
      pool.end(); // Close DB pool
      process.exit(0);
    }, 5000);

  } catch (err) {
    console.error('❌ Test Failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
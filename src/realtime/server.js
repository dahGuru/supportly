const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');
const { pool } = require('../lib/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Or whatever worked in your diagnostic

const server = http.createServer();
const wss = new WebSocket.Server({ server });

async function getGeminiAnswer(query, tenantId, botId) {
  const result = await embedModel.embedContent(query);
  const vector = JSON.stringify(result.embedding.values);
  
  const res = await pool.query(
    `SELECT chunk_text FROM documents 
     WHERE tenant_id = $1 AND bot_id = $2 
     ORDER BY embedding <=> $3 LIMIT 3`,
    [tenantId, botId, vector]
  );
  
  const context = res.rows.map(r => r.chunk_text).join("\n\n---\n\n");
  
  const prompt = `
    You are a helpful customer support agent. 
    Use the following CONTEXT from our knowledge base to answer the User Question.
    If the answer is not in the context, politely say you don't know.
    
    CONTEXT:
    ${context}
    
    User Question: ${query}
  `;

  const streamingResp = await chatModel.generateContentStream(prompt);
  return streamingResp.stream;
}

wss.on('connection', async (ws, req) => {
  const token = req.url.split('token=')[1];
  let tenantId;
  try {
    const decoded = jwt.verify(token, process.env.WS_JWT_SECRET);
    tenantId = decoded.tenantId;
  } catch(e) { ws.close(); return; }

  // Track conversation for this connection
  let conversationId = null;

  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    
    if (data.type === 'visitor.message') {
      try {
        // 1. Create Conversation if it doesn't exist
        if (!conversationId) {
          const convRes = await pool.query(
            `INSERT INTO conversations (tenant_id, bot_id, status) VALUES ($1, $2, 'open') RETURNING id`,
            [tenantId, data.botId]
          );
          conversationId = convRes.rows[0].id;
        }

        // 2. Log Visitor Message
        await pool.query(
          `INSERT INTO messages (conversation_id, sender_type, text) VALUES ($1, 'visitor', $2)`,
          [conversationId, data.text]
        );

        console.log(`Received from Tenant ${tenantId}: ${data.text}`);

        // 3. Generate Answer
        const stream = await getGeminiAnswer(data.text, tenantId, data.botId);
        
        let fullBotResponse = "";

        for await (const chunk of stream) {
          const content = chunk.text();
          if (content) {
            fullBotResponse += content; // Accumulate full text
            ws.send(JSON.stringify({ type: 'bot.message', text: content }));
          }
        }

        // 4. Log Bot Message (Full text)
        await pool.query(
          `INSERT INTO messages (conversation_id, sender_type, text) VALUES ($1, 'bot', $2)`,
          [conversationId, fullBotResponse]
        );

      } catch (err) {
        console.error("Error:", err.message);
        ws.send(JSON.stringify({ type: 'bot.message', text: "I'm having trouble connecting." }));
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`WebSocket Server running on port ${PORT}...`));
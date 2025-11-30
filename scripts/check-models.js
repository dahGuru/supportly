// scripts/check-models.js
const axios = require('axios');
require('dotenv').config();

const key = process.env.GEMINI_API_KEY;
if (!key) { console.error("❌ No GEMINI_API_KEY found in .env"); process.exit(1); }

console.log(`Checking models for key: ${key.substring(0, 8)}...`);

async function check() {
  try {
    // 1. List all available models
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const res = await axios.get(url);
    
    console.log("\n✅ SUCCESS! Here are the models your key can access:\n");
    
    const models = res.data.models.map(m => m.name.replace('models/', ''));
    
    // Filter for the ones we care about
    const chatModels = models.filter(m => m.includes('gemini'));
    const embedModels = models.filter(m => m.includes('embedding'));
    
    console.log("--- CHAT MODELS ---");
    console.log(chatModels.join('\n'));
    
    console.log("\n--- EMBEDDING MODELS ---");
    console.log(embedModels.join('\n'));
    
  } catch (e) {
    console.error("\n❌ ERROR: Could not list models.");
    if (e.response) {
      console.error(`Status: ${e.response.status}`);
      console.error("Reason:", JSON.stringify(e.response.data, null, 2));
    } else {
      console.error(e.message);
    }
  }
}

check();
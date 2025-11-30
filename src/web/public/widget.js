(function () {
  const tenant = window._CS?.tenant;
  if (!tenant) return console.error('Supportly: Missing tenant ID');

  const API_URL = 'http://localhost:3000/api/widget-auth';
  const WS_URL = 'ws://localhost:4000';

  // 1. Inject CSS
  const style = document.createElement('style');
  style.innerHTML = `
    #supportly-btn { position:fixed; right:20px; bottom:20px; width:60px; height:60px; background:#2563eb; border-radius:30px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center; z-index:9999; transition: transform 0.2s; }
    #supportly-btn:hover { transform: scale(1.05); }
    #supportly-box { position:fixed; right:20px; bottom:90px; width:350px; height:500px; background:#fff; border-radius:12px; box-shadow:0 5px 20px rgba(0,0,0,0.2); display:none; flex-direction:column; overflow:hidden; z-index:9999; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #supportly-header { background:#2563eb; color:white; padding:16px; font-weight:bold; }
    #supportly-messages { flex:1; padding:16px; overflow-y:auto; background:#f9fafb; }
    #supportly-input-area { padding:12px; border-top:1px solid #eee; display:flex; }
    #supportly-input { flex:1; border:1px solid #ddd; padding:8px 12px; border-radius:20px; outline:none; }
    .msg { margin-bottom:10px; max-width:80%; padding:8px 12px; border-radius:12px; font-size:14px; line-height:1.4; word-wrap: break-word; }
    .msg.visitor { background:#2563eb; color:white; align-self:flex-end; border-bottom-right-radius:2px; margin-left:auto; }
    .msg.bot { background:#e5e7eb; color:#1f2937; align-self:flex-start; border-bottom-left-radius:2px; }
  `;
  document.head.appendChild(style);

  // 2. Create UI Elements
  const btn = document.createElement('div');
  btn.id = 'supportly-btn';
  btn.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
  
  const box = document.createElement('div');
  box.id = 'supportly-box';
  box.innerHTML = `
    <div id="supportly-header">Support Chat</div>
    <div id="supportly-messages" style="display:flex; flex-direction:column;"></div>
    <div id="supportly-input-area">
      <input id="supportly-input" type="text" placeholder="Ask us anything..." />
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(box);

  // 3. Logic
  let isOpen = false;
  let ws = null;
  const messagesDiv = box.querySelector('#supportly-messages');
  const input = box.querySelector('#supportly-input');

  btn.onclick = () => {
    isOpen = !isOpen;
    box.style.display = isOpen ? 'flex' : 'none';
    if (isOpen && !ws) connect();
    if (isOpen) input.focus();
  };

  input.onkeypress = (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      sendMessage(input.value.trim());
      input.value = '';
    }
  };

  // --- CHANGED: Smarter appending ---
  function appendMsg(text, type) {
    const lastMsg = messagesDiv.lastElementChild;
    
    // If the last message was also from the bot, append to it (Streaming effect)
    if (type === 'bot' && lastMsg && lastMsg.classList.contains('bot')) {
      lastMsg.innerText += text;
    } else {
      // Otherwise create a new bubble
      const div = document.createElement('div');
      div.className = `msg ${type}`;
      div.innerText = text;
      messagesDiv.appendChild(div);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async function connect() {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant: tenant, tenantId: tenant }) 
      });
      const data = await res.json();
      
      ws = new WebSocket(`${WS_URL}?token=${data.token}`);
      
      ws.onopen = () => appendMsg('Connected to support.', 'bot');
      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === 'bot.message') appendMsg(payload.text, 'bot');
      };
      
    } catch (e) {
      console.error(e);
      appendMsg('Could not connect.', 'bot');
    }
  }

  function sendMessage(text) {
    if (!ws) return;
    appendMsg(text, 'visitor');
    ws.send(JSON.stringify({ type: 'visitor.message', text, botId: window._CS.botId }));
  }

})();
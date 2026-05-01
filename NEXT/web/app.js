/* ═══════════════════════════════════════════════════════════════
   NEXUS STATION — Core Systems
   Neural EXecution Universal System
   ═══════════════════════════════════════════════════════════════ */

// ─── STARFIELD ENGINE ───
class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.hyperspace = false;
    this.resize();
    this.initStars();
    this.animate();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
  }

  initStars() {
    this.stars = [];
    const count = Math.floor((this.canvas.width * this.canvas.height) / 3000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        z: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.005
      });
    }
  }

  animate() {
    this.ctx.fillStyle = '#050508';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const star of this.stars) {
      star.brightness += star.twinkleSpeed;
      const alpha = 0.3 + Math.abs(Math.sin(star.brightness)) * 0.7;
      
      const speed = this.hyperspace ? star.z * 8 : star.z * 0.2;
      star.x += (star.x - this.centerX) * speed * 0.001;
      star.y += (star.y - this.centerY) * speed * 0.001;

      if (star.x < 0 || star.x > this.canvas.width || star.y < 0 || star.y > this.canvas.height) {
        star.x = Math.random() * this.canvas.width;
        star.y = Math.random() * this.canvas.height;
        star.z = Math.random() * 2 + 0.5;
      }

      const size = star.z * (this.hyperspace ? 1.5 : 0.8);
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
      this.ctx.fill();

      if (this.hyperspace && star.z > 1.5) {
        this.ctx.beginPath();
        this.ctx.moveTo(star.x, star.y);
        this.ctx.lineTo(
          star.x - (star.x - this.centerX) * 0.1,
          star.y - (star.y - this.centerY) * 0.1
        );
        this.ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.3})`;
        this.ctx.lineWidth = size;
        this.ctx.stroke();
      }
    }

    requestAnimationFrame(() => this.animate());
  }

  engage() {
    this.hyperspace = true;
    setTimeout(() => { this.hyperspace = false; }, 2000);
  }
}

// ─── STATION CLOCK ───
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('ru-RU', { hour12: false });
  document.getElementById('station-time').textContent = time;
}
setInterval(updateClock, 1000);
updateClock();

// ─── COMMS SYSTEM ───
class CommsSystem {
  constructor() {
    this.messagesEl = document.getElementById('comms-messages');
    this.inputEl = document.getElementById('transmit-input');
    this.btnEl = document.getElementById('transmit-btn');
    this.msgCountEl = document.getElementById('msg-count');
    this.providerDot = document.getElementById('provider-dot');
    this.providerName = document.getElementById('provider-name');
    this.messages = [];
    this.sessionId = this.generateId();
    this.ws = null;
    this.provider = null;

    this.bindEvents();
    this.connect();
  }

  generateId() {
    return 'nxs-' + Math.random().toString(36).substr(2, 9);
  }

  bindEvents() {
    this.btnEl.addEventListener('click', () => this.transmit());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.transmit();
      }
    });
    this.inputEl.addEventListener('input', () => this.autoResize());

    document.getElementById('provider-select').addEventListener('change', (e) => {
      this.setProvider(e.target.value);
    });

    // Sliders
    const sliders = [
      { id: 'temp-slider', target: 'temp-value', scale: 100 },
      { id: 'tokens-slider', target: 'tokens-value', scale: 1, offset: 0, multiplier: 100 },
      { id: 'topp-slider', target: 'topp-value', scale: 100 }
    ];
    sliders.forEach(s => {
      const el = document.getElementById(s.id);
      const target = document.getElementById(s.target);
      el.addEventListener('input', () => {
        const val = parseInt(el.value);
        if (s.id === 'tokens-slider') {
          target.textContent = val * 100;
        } else {
          target.textContent = (val / s.scale).toFixed(1);
        }
      });
    });

    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setTheme(btn.dataset.theme);
      });
    });

    // Nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  }

  autoResize() {
    this.inputEl.style.height = 'auto';
    this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 200) + 'px';
  }

  setProvider(provider) {
    this.provider = provider;
    if (provider) {
      this.providerDot.className = 'status-dot active';
      const names = {
        openai: 'OpenAI GPT-4o',
        anthropic: 'Anthropic Claude',
        google: 'Google Gemini',
        fireworks: 'Fireworks Llama',
        local: 'Local Ollama'
      };
      this.providerName.textContent = 'PROVIDER: ' + (names[provider] || provider).toUpperCase();
    } else {
      this.providerDot.className = 'status-dot standby';
      this.providerName.textContent = 'PROVIDER: STANDBY';
    }
  }

  setTheme(theme) {
    const themes = {
      void: { '--cyan': '#00f0ff', '--purple': '#b829dd', '--orange': '#ff6b00' },
      nebula: { '--cyan': '#ff6b9d', '--purple': '#c44569', '--orange': '#f8b500' },
      solar: { '--cyan': '#ff9500', '--purple': '#ff5e3a', '--orange': '#ffcc00' },
      matrix: { '--cyan': '#00ff41', '--purple': '#008f11', '--orange': '#003b00' }
    };
    const t = themes[theme] || themes.void;
    const root = document.documentElement;
    Object.entries(t).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  connect() {
    // Placeholder WebSocket connection
    // In production: ws://host:port/api/v1/wire/{sessionId}
    console.log('[NEXUS] Comms channel initialized. Session:', this.sessionId);
  }

  transmit() {
    const text = this.inputEl.value.trim();
    if (!text) return;

    if (!this.provider) {
      audio.alert();
      this.addSystemMessage('⚠️ Выберите провайдера в панели SYSTEMS перед отправкой.');
      return;
    }

    audio.transmit();
    this.addMessage('user', 'Коммандер', text);
    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';
    this.showTyping();

    // Simulate AI response (replace with real API call)
    starfield.engage();
    setTimeout(() => {
      this.hideTyping();
      audio.receive();
      this.simulateResponse(text);
    }, 1500 + Math.random() * 2000);
  }

  simulateResponse(userText) {
    const responses = [
      `Принято, Коммандер. Анализирую запрос: "${userText}"...\n\nСистемы функционируют в норме. Готов к выполнению миссии.`,
      `Входящая передача обработана. NEXUS готовит ответ...\n\nЗапрос принят. Инициирую протокол выполнения.`,
      `Данные получены. Запускаю нейронные вычисления...\n\nРезультат готов. Системы стабильны.`,
      `Команда подтверждена. Перевожу станцию в режим обработки...\n\nАнализ завершён. Все параметры в норме.`
    ];
    const response = responses[Math.floor(Math.random() * responses.length)];
    this.addMessage('ai', 'NEXUS AI', response);
  }

  addMessage(type, sender, text) {
    const msg = {
      id: this.generateId(),
      type,
      sender,
      text,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
    this.messages.push(msg);
    this.renderMessage(msg);
    this.msgCountEl.textContent = this.messages.length;
    this.scrollToBottom();
  }

  addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg system-msg';
    div.innerHTML = `
      <div style="text-align:center; padding:8px; color:var(--orange); font-size:12px; border:1px dashed var(--orange-dim); border-radius:4px; margin:4px 0;">
        ⚡ ${text}
      </div>
    `;
    this.messagesEl.appendChild(div);
    this.scrollToBottom();
  }

  renderMessage(msg) {
    const div = document.createElement('div');
    div.className = `msg msg-${msg.type}`;
    div.innerHTML = `
      <div class="msg-avatar">${msg.type === 'user' ? '👤' : '◈'}</div>
      <div class="msg-content">
        <div class="msg-header">
          <span class="msg-sender">${msg.sender}</span>
          <span class="msg-time">${msg.time}</span>
        </div>
        <div class="msg-text">${this.escapeHtml(msg.text).replace(/\n/g, '<br>')}</div>
      </div>
    `;
    this.messagesEl.appendChild(div);
  }

  showTyping() {
    const div = document.createElement('div');
    div.className = 'msg msg-ai typing-indicator';
    div.id = 'typing-indicator';
    div.innerHTML = `
      <div class="msg-avatar">◈</div>
      <div class="msg-content">
        <div class="msg-header"><span class="msg-sender">NEXUS AI</span></div>
        <div class="typing">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;
    this.messagesEl.appendChild(div);
    this.scrollToBottom();
  }

  hideTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ─── AUDIO SYSTEM ───
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(freq, duration, type = 'sine', volume = 0.1) {
    if (!this.enabled) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  transmit() {
    this.playTone(880, 0.15, 'sine', 0.08);
    setTimeout(() => this.playTone(1320, 0.2, 'sine', 0.06), 80);
  }

  receive() {
    this.playTone(660, 0.1, 'sine', 0.05);
    setTimeout(() => this.playTone(880, 0.15, 'sine', 0.04), 100);
  }

  alert() {
    this.playTone(440, 0.2, 'square', 0.05);
    setTimeout(() => this.playTone(440, 0.2, 'square', 0.05), 250);
  }
}

const audio = new AudioSystem();

// ─── INIT ───
const canvas = document.getElementById('starfield');
const starfield = new Starfield(canvas);
const comms = new CommsSystem();

console.log('%c◈ NEXUS STATION ◈', 'color:#00f0ff; font-size:20px; font-family:monospace;');
console.log('%cNeural EXecution Universal System v2.0.0', 'color:#b829dd; font-size:12px;');
console.log('%cAll systems nominal. Welcome aboard, Commander.', 'color:#606880; font-size:11px;');

// === 音效模組 ===
/**
 * Web Audio API 音效模組 (100% 離線可用，無外部相依)
 */
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTap() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.setValueAtTime(190, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const start = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start + idx * 0.1);
        gain.gain.setValueAtTime(0.2, start + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, start + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start + idx * 0.1);
        osc.stop(start + idx * 0.1 + 0.3);
      });
    } catch (e) {}
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      const start = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start + idx * 0.08);
        gain.gain.setValueAtTime(0.22, start + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, start + idx * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start + idx * 0.08);
        osc.stop(start + idx * 0.08 + 0.4);
      });
    } catch (e) {}
  }

  playTick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {}
  }

  playTimesUp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(392.00, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }
}

const sound = new SoundEffects();

// === 語音模組 ===
/**
 * Web Speech API 國語發音模組 (支援 iPad Safari 原生 zh-TW 高品質臺灣語音)
 */
class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoiceURI = '';
    this.twVoice = null;
    this.rate = 0.85; // 適中語速，適合聽寫
    this.volume = 1.0;
    this.pitch = 1.0;
    this.isSpeaking = false;

    if (this.synth) {
      this.loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.findBestTwVoice();
  }

  findBestTwVoice() {
    if (!this.voices || this.voices.length === 0) return;

    if (this.selectedVoiceURI) {
      const found = this.voices.find(v => v.voiceURI === this.selectedVoiceURI);
      if (found) {
        this.twVoice = found;
        return;
      }
    }

    const isTaiwanese = (v) => {
      const lang = (v.lang || '').replace('_', '-').toLowerCase();
      const name = (v.name || '').toLowerCase();
      return (
        lang === 'zh-tw' ||
        lang === 'cmn-hant-tw' ||
        lang === 'cmn-tw' ||
        name.includes('taiwan') ||
        name.includes('台灣') ||
        name.includes('臺灣') ||
        name.includes('mei-jia') ||
        name.includes('美佳') ||
        name.includes('hanhan') ||
        name.includes('漢漢')
      );
    };

    const twVoices = this.voices.filter(isTaiwanese);

    if (twVoices.length > 0) {
      const premiumVoice = twVoices.find(v => {
        const n = (v.name || '').toLowerCase();
        return n.includes('siri') || n.includes('enhanced') || n.includes('增強') || n.includes('natural');
      });
      this.twVoice = premiumVoice || twVoices[0];
    } else {
      this.twVoice = this.voices.find(v => (v.lang || '').toLowerCase().startsWith('zh')) || null;
    }
  }

  getChineseVoices() {
    if (!this.voices || this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices.filter(v => {
      const l = (v.lang || '').replace('_', '-').toLowerCase();
      const n = (v.name || '').toLowerCase();
      return l.startsWith('zh') || l.startsWith('cmn') || n.includes('taiwan') || n.includes('chinese');
    });
  }

  setVoice(voiceURI) {
    this.selectedVoiceURI = voiceURI || '';
    this.findBestTwVoice();
  }

  setRate(val) {
    this.rate = Math.max(0.5, Math.min(1.5, parseFloat(val) || 0.85));
  }

  setVolume(val) {
    this.volume = Math.max(0.1, Math.min(1.0, parseFloat(val) || 1.0));
  }

  speak(text, onStart, onEnd) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    this.stop();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = this.rate;
    utter.volume = this.volume;
    utter.pitch = this.pitch;

    if (this.twVoice) {
      utter.voice = this.twVoice;
      utter.lang = this.twVoice.lang;
    } else {
      utter.lang = 'zh-TW';
    }

    utter.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utter.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utter.onerror = (e) => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    this.synth.speak(utter);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}

const speech = new SpeechManager();

// === 計時器模組 ===
/**
 * 測驗計時器模組 (支援「不限時記錄模式」、「全卷總時長倒數」與「單題倒數」)
 */


class QuizTimer {
  constructor(durationSeconds = 0, isCountdown = false) {
    this.duration = durationSeconds;
    this.isCountdown = isCountdown;
    this.remaining = durationSeconds;
    this.elapsed = 0;
    this.intervalId = null;
    this.isRunning = false;

    this.onTick = null;
    this.onTimeout = null;
  }

  setMode(durationSeconds, isCountdown = false) {
    this.duration = durationSeconds;
    this.isCountdown = isCountdown;
    this.reset();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      if (this.isCountdown) {
        this.remaining--;
        this.elapsed++;

        if (this.remaining <= 5 && this.remaining > 0) {
          sound.playTick();
        }

        if (this.onTick) {
          this.onTick(this.remaining, this.duration);
        }

        if (this.remaining <= 0) {
          this.stop();
          sound.playTimesUp();
          if (this.onTimeout) {
            this.onTimeout();
          }
        }
      } else {
        this.elapsed++;
        if (this.onTick) {
          this.onTick(this.elapsed, 0);
        }
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  reset() {
    this.stop();
    this.remaining = this.duration;
    this.elapsed = 0;
  }

  getElapsedSeconds() {
    return this.elapsed;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

// === 田字格畫布核心 ===
/**
 * 田字格 / 米字格 Canvas 手寫核心模組
 * 深度支援 iPad + Apple Pencil 240Hz 高頻採樣、Retina 像素對齊、微位移極速連筆與防手掌誤觸
 */
class TianZiGeCanvas {
  /**
   * @param {HTMLCanvasElement} canvasElement 
   * @param {Object} options 
   */
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    
    this.options = Object.assign({
      gridType: 'tian', // 'tian' (田字格) 或 'mi' (米字格)
      gridColor: '#f43f5e',
      lineColor: '#fca5a5',
      inkColor: '#1e293b',
      baseStrokeWidth: 4.8,
      pressureSensitive: true,
      penOnly: false, // 是否僅允許 Apple Pencil (防止手掌誤觸)
      onStrokeEnd: null
    }, options);

    this.isDrawing = false;
    this.isLocked = false;
    this.currentPointerId = null;
    this.strokes = []; // 歷史筆劃 (Array of points)
    this.currentStroke = [];

    this.dpr = window.devicePixelRatio || 1;
    this.initCanvasSize();
    this.bindEvents();
    this.render();
  }

  initCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.round(rect.width || 150);
    const height = Math.round(rect.height || 150);

    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);

    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.canvas.style.touchAction = 'none'; // 強制禁止瀏覽器手勢延遲

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cssWidth = width;
    this.cssHeight = height;
  }

  bindEvents() {
    const el = this.canvas;
    // 使用 { passive: false } 確保 e.preventDefault() 100% 生效，防止 iOS 瀏覽器手勢攔截與中斷筆劃
    el.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
    el.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
    el.addEventListener('pointerup', (e) => this.onPointerUp(e), { passive: false });
    el.addEventListener('pointercancel', (e) => this.onPointerCancel(e), { passive: false });
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? (this.cssWidth / rect.width) : 1;
    const scaleY = rect.height > 0 ? (this.cssHeight / rect.height) : 1;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: (e.pressure !== undefined && e.pressure > 0) ? e.pressure : 0.5,
      pointerType: e.pointerType
    };
  }

  onPointerDown(e) {
    if (this.isLocked) return;
    // 若開啟「Apple Pencil 專用模式」，忽略所有手指或手掌誤觸 (touch)
    if (this.options.penOnly && e.pointerType === 'touch') return;

    e.preventDefault();

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    this.isDrawing = true;
    this.currentPointerId = e.pointerId;

    const pt = this.getPointerPos(e);
    this.currentStroke = [pt];
    this.drawDot(pt); // 落筆瞬間立即畫點，0 延遲即時反饋
  }

  onPointerMove(e) {
    if (!this.isDrawing || this.isLocked) return;
    if (this.currentPointerId !== null && e.pointerId !== this.currentPointerId) return;

    e.preventDefault();

    // 關鍵升級：支援 iPad Pro/Air 240Hz 高頻採樣 (getCoalescedEvents)
    // 快速運筆、連筆、撇捺時，完整捕獲所有中間微小座標點，絕不掉筆劃！
    const events = (e.getCoalescedEvents && e.getCoalescedEvents().length > 0)
      ? e.getCoalescedEvents()
      : [e];

    for (const ev of events) {
      const pt = this.getPointerPos(ev);
      const len = this.currentStroke.length;
      if (len > 0) {
        const lastPt = this.currentStroke[len - 1];
        const dx = pt.x - lastPt.x;
        const dy = pt.y - lastPt.y;
        // 靈敏度門檻：位移 >= 0.5 像素 (平方 >= 0.25) 即時連線繪製，極度靈敏跟筆
        if (dx * dx + dy * dy >= 0.25) {
          this.currentStroke.push(pt);
          this.drawSegment(lastPt, pt);
        }
      } else {
        this.currentStroke.push(pt);
        this.drawDot(pt);
      }
    }
  }

  onPointerUp(e) {
    if (!this.isDrawing) return;
    if (this.currentPointerId !== null && e.pointerId !== this.currentPointerId) return;
    e.preventDefault();

    this.isDrawing = false;
    this.currentPointerId = null;

    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (this.currentStroke.length > 0) {
      this.strokes.push([...this.currentStroke]);
      this.currentStroke = [];
    }

    if (typeof this.options.onStrokeEnd === 'function') {
      this.options.onStrokeEnd();
    }
  }

  onPointerCancel(e) {
    this.onPointerUp(e);
  }

  drawDot(pt) {
    const ctx = this.ctx;
    const p = (pt.pressure !== undefined && pt.pressure > 0) ? pt.pressure : 0.5;
    // 提升最低筆寬，保證輕觸落筆依然清晰有感
    const radius = Math.max(1.8, (this.options.baseStrokeWidth * (this.options.pressureSensitive ? (0.65 + p * 0.8) : 1.0)) / 2);

    ctx.fillStyle = this.options.inkColor;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSegment(p1, p2) {
    const ctx = this.ctx;
    const p = (p1.pressure + p2.pressure) / 2;
    // 動態筆寬公式：保證輕手快速寫字時筆觸飽滿靈敏，重壓時自然加粗
    const width = this.options.pressureSensitive
      ? Math.max(2.8, this.options.baseStrokeWidth * (0.65 + p * 0.8))
      : this.options.baseStrokeWidth;

    ctx.strokeStyle = this.options.inkColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  render() {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    ctx.clearRect(0, 0, w, h);

    // 1. 繪製田字格 / 米字格背景
    this.drawBackgroundGrid(ctx, w, h);

    // 2. 繪製所有歷史筆劃
    for (const stroke of this.strokes) {
      if (stroke.length === 0) continue;
      if (stroke.length === 1) {
        this.drawDot(stroke[0]);
        continue;
      }

      for (let i = 1; i < stroke.length; i++) {
        this.drawSegment(stroke[i - 1], stroke[i]);
      }
    }
  }

  drawBackgroundGrid(ctx, w, h) {
    ctx.save();

    // 溫潤米白紙張質感
    ctx.fillStyle = '#fffefc';
    ctx.fillRect(0, 0, w, h);

    const pad = 2;
    const bw = w - pad * 2;
    const bh = h - pad * 2;

    // 外邊框 (紅色實線)
    ctx.strokeStyle = this.options.gridColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(pad, pad, bw, bh);

    // 輔助虛線
    ctx.strokeStyle = this.options.lineColor;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);

    // 水平中心線
    ctx.beginPath();
    ctx.moveTo(pad, h / 2);
    ctx.lineTo(w - pad, h / 2);
    ctx.stroke();

    // 垂直中心線
    ctx.beginPath();
    ctx.moveTo(w / 2, pad);
    ctx.lineTo(w / 2, h - pad);
    ctx.stroke();

    // 米字格對角虛線
    if (this.options.gridType === 'mi') {
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(pad, pad);
      ctx.lineTo(w - pad, h - pad);
      ctx.moveTo(w - pad, pad);
      ctx.lineTo(pad, h - pad);
      ctx.stroke();
    }

    ctx.restore();
  }

  getStrokes() {
    return JSON.parse(JSON.stringify(this.strokes));
  }

  setStrokes(strokes) {
    this.strokes = strokes ? JSON.parse(JSON.stringify(strokes)) : [];
    this.render();
  }

  undo() {
    if (this.isLocked || this.strokes.length === 0) return;
    this.strokes.pop();
    this.render();
  }

  clear() {
    if (this.isLocked) return;
    this.strokes = [];
    this.currentStroke = [];
    this.render();
  }

  setLocked(locked) {
    this.isLocked = !!locked;
    if (this.isLocked) {
      this.isDrawing = false;
      this.canvas.parentElement?.classList.add('locked');
    } else {
      this.canvas.parentElement?.classList.remove('locked');
    }
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  hasContent() {
    return this.strokes.length > 0;
  }
}


// === 題庫管理模組 ===
/**
 * 題庫管理模組 (相容並共享 gifted_s_word_banks 題庫)
 */

const STORAGE_KEY_BANKS = 'gifted_s_word_banks';
const STORAGE_KEY_ACTIVE_BANK = 'gifted_s_active_bank_id';

const DEFAULT_BANKS = [
  {
    id: 'bank-default-1',
    name: '國語常用生字測驗 (20題)',
    words: [
      '學校', '老師', '同學', '讀書', '寫字',
      '美麗', '高興', '遵守', '禮貌', '感謝',
      '太陽', '月亮', '森林', '海洋', '希望',
      '勇氣', '努力', '快樂', '健康', '和平'
    ],
    createdAt: Date.now()
  },
  {
    id: 'bank-default-2',
    name: '基礎單字練習 (10題)',
    words: ['春', '夏', '秋', '冬', '山', '水', '花', '鳥', '風', '雨'],
    createdAt: Date.now()
  }
];

class BankManager {
  constructor() {
    this.banks = [];
    this.activeBankId = null;
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BANKS);
      if (saved) {
        this.banks = JSON.parse(saved);
      } else {
        this.banks = [...DEFAULT_BANKS];
        this.saveToStorage();
      }

      const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_BANK);
      if (activeId && this.banks.some(b => b.id === activeId)) {
        this.activeBankId = activeId;
      } else if (this.banks.length > 0) {
        this.activeBankId = this.banks[0].id;
      }
    } catch (e) {
      console.error('Failed to load banks:', e);
      this.banks = [...DEFAULT_BANKS];
      this.activeBankId = this.banks[0].id;
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_BANKS, JSON.stringify(this.banks));
      if (this.activeBankId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_BANK, this.activeBankId);
      }
    } catch (e) {
      console.error('Failed to save banks:', e);
    }
  }

  getBanks() {
    return this.banks;
  }

  getActiveBank() {
    return this.banks.find(b => b.id === this.activeBankId) || this.banks[0] || null;
  }

  setActiveBank(id) {
    if (this.banks.some(b => b.id === id)) {
      this.activeBankId = id;
      this.saveToStorage();
    }
  }

  addBank(name, rawText) {
    const words = this.parseWords(rawText);
    if (words.length === 0) return null;

    const newBank = {
      id: 'bank-' + Date.now(),
      name: name.trim() || '未命名題庫',
      words: words,
      createdAt: Date.now()
    };

    this.banks.push(newBank);
    this.activeBankId = newBank.id;
    this.saveToStorage();
    return newBank;
  }

  updateBank(id, name, rawText) {
    const bank = this.banks.find(b => b.id === id);
    if (!bank) return false;

    const words = this.parseWords(rawText);
    if (words.length === 0) return false;

    bank.name = name.trim() || bank.name;
    bank.words = words;
    this.saveToStorage();
    return true;
  }

  deleteBank(id) {
    if (this.banks.length <= 1) {
      alert('至少需要保留一個題庫！');
      return false;
    }

    this.banks = this.banks.filter(b => b.id !== id);
    if (this.activeBankId === id) {
      this.activeBankId = this.banks[0].id;
    }
    this.saveToStorage();
    return true;
  }

  parseWords(rawText) {
    if (!rawText) return [];
    const separators = /[\n,，、\s\t]+/;
    return rawText
      .split(separators)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  }

  exportJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.banks, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `dictation_word_banks_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  }

  importJSON(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) throw new Error('題庫格式錯誤');

      let validCount = 0;
      imported.forEach(item => {
        if (item.name && Array.isArray(item.words) && item.words.length > 0) {
          const exists = this.banks.some(b => b.id === item.id);
          const newId = exists ? 'bank-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4) : (item.id || 'bank-' + Date.now());
          this.banks.push({
            id: newId,
            name: item.name,
            words: item.words,
            createdAt: item.createdAt || Date.now()
          });
          validCount++;
        }
      });

      if (validCount > 0) {
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

const bankManager = new BankManager();

// === 測驗紀錄與錯題模組 ===
/**
 * 測驗歷次紀錄與錯題管理模組
 * 遵循指示：不儲存寫字圖片樣子，只記錄該題的文字與對錯狀態！
 */

const STORAGE_KEY_RECORDS = 'gifted_s_exam_records';

class RecordsManager {
  constructor() {
    this.records = [];
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        this.records = JSON.parse(saved);
      } else {
        this.records = [];
      }
    } catch (e) {
      console.error('Failed to load exam records:', e);
      this.records = [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(this.records));
    } catch (e) {
      console.error('Failed to save exam records:', e);
    }
  }

  getRecords() {
    return [...this.records].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  addRecord({ bankName, totalCount, correctCount, wrongCount, score, wrongWords, items }) {
    const newRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      bankName: bankName || '常用生字',
      totalCount: totalCount,
      correctCount: correctCount,
      wrongCount: wrongCount,
      score: score,
      wrongWords: wrongWords || [], // 僅儲存題目文字！
      items: (items || []).map(item => ({
        word: item.word,
        isCorrect: !!item.isCorrect
      }))
    };

    this.records.unshift(newRecord);
    this.saveToStorage();
    return newRecord;
  }

  deleteRecord(id) {
    this.records = this.records.filter(r => r.id !== id);
    this.saveToStorage();
  }

  clearAll() {
    this.records = [];
    this.saveToStorage();
  }

  getOverallStats() {
    const total = this.records.length;
    if (total === 0) {
      return { totalTests: 0, avgScore: 0, totalWrongCount: 0 };
    }

    const totalScore = this.records.reduce((sum, r) => sum + (r.score || 0), 0);
    const totalWrong = this.records.reduce((sum, r) => sum + ((r.wrongWords && r.wrongWords.length) || 0), 0);

    return {
      totalTests: total,
      avgScore: Math.round(totalScore / total),
      totalWrongCount: totalWrong
    };
  }

  getTopWrongWords(limit = 10) {
    const freqMap = {};
    for (const rec of this.records) {
      if (Array.isArray(rec.wrongWords)) {
        for (const w of rec.wrongWords) {
          if (!w) continue;
          freqMap[w] = (freqMap[w] || 0) + 1;
        }
      }
    }

    const list = Object.keys(freqMap).map(w => ({ word: w, count: freqMap[w] }));
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, limit);
  }
}

const recordsManager = new RecordsManager();

// === 主控制器 ===
/**
 * 國語生字聽寫測驗 App (Exam Mode) 主應用控制器
 * 支援：全卷作答、交卷總覽、個別修改、逐題批改、錯題純文字記錄與錯題本
 */

const STORAGE_KEY_SETTINGS = 'gifted_s_exam_settings';

class ExamAppController {
  constructor() {
    this.settings = {
      countdownSeconds: 30,
      gridType: 'tian',        // 'tian' 或 'mi'
      gridSize: 'comfortable', // 'compact' (80px), 'comfortable' (150px), 'large' (200px)
      speechRate: 0.85,
      speechVolume: 1.0,
      voiceURI: '',
      penOnly: false,
      soundEffects: true,
      defaultQuestionCount: 20,
      randomOrder: true,
      timerMode: 'none',       // 'none', 'total', 'per_question'
      totalMinutes: 10
    };

    // 測驗即時狀態
    this.activeExam = {
      bankName: '',
      questions: [],           // [{ index, word, chars, strokes, hasWritten, snapshot, isCorrect }]
      currentIndex: 0,
      isEditingFromReview: false,
      startTime: 0,
      totalTimeSec: 0
    };

    this.currentCanvases = [];
    this.timer = new QuizTimer();

    this.initDOM();
    this.loadSettings();
    this.initTimerCallbacks();
    this.bindEvents();

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.populateVoiceList();
      };
    }

    // 初始進入測驗設定主頁
    this.showStartScreen();
  }

  initDOM() {
    // 頂欄導覽
    this.navBtns = document.querySelectorAll('.nav-btn');
    this.views = {
      start: document.getElementById('view-start'),
      quiz: document.getElementById('view-quiz'),
      review: document.getElementById('view-review'),
      grading: document.getElementById('view-grading'),
      result: document.getElementById('view-result'),
      records: document.getElementById('view-records'),
      banks: document.getElementById('view-banks'),
      settings: document.getElementById('view-settings')
    };

    // 測驗設定頁 (Start)
    this.selectStartBank = document.getElementById('start-bank-select');
    this.selectStartCount = document.getElementById('start-count-select');
    this.selectStartOrder = document.getElementById('start-order-select');
    this.selectStartTimer = document.getElementById('start-timer-select');
    this.btnStartExam = document.getElementById('btn-start-exam');
    this.btnViewRecordsDirect = document.getElementById('btn-view-records-direct');

    // 聽寫作答區 (Quiz)
    this.elQuizProgress = document.getElementById('quiz-progress-text');
    this.elQuizBankBadge = document.getElementById('quiz-bank-badge');
    this.elTimerPill = document.getElementById('timer-pill');
    this.elTimerText = document.getElementById('timer-text');
    this.elPillStrip = document.getElementById('exam-pill-strip');
    this.elEditingBanner = document.getElementById('editing-banner');
    this.elEditingQNum = document.getElementById('editing-q-num');
    this.btnFinishEdit = document.getElementById('btn-finish-edit');
    this.elGridContainer = document.getElementById('tian-grid-container');
    this.btnClearCanvas = document.getElementById('btn-clear-canvas');
    this.btnUndoStroke = document.getElementById('btn-undo-stroke');
    this.btnPlayVoice = document.getElementById('btn-play-voice');
    this.btnQuizPrev = document.getElementById('btn-quiz-prev');
    this.btnQuizNext = document.getElementById('btn-quiz-next');
    this.btnQuizSubmitHead = document.getElementById('btn-quiz-submit-head');

    // 交卷總覽 (Review)
    this.elReviewStatBadge = document.getElementById('review-stat-badge');
    this.elReviewGrid = document.getElementById('review-grid');
    this.btnReviewBack = document.getElementById('btn-review-back');
    this.btnConfirmSubmit = document.getElementById('btn-confirm-submit');

    // 逐題批改 (Grading)
    this.elGradingLiveScore = document.getElementById('grading-live-score');
    this.elGradeCorrectCount = document.getElementById('grade-correct-count');
    this.elGradeWrongCount = document.getElementById('grade-wrong-count');
    this.elGradingList = document.getElementById('grading-list');
    this.btnFinishGrading = document.getElementById('btn-finish-grading');

    // 結算與錯題展示 (Result)
    this.elResultScoreNum = document.getElementById('result-score-num');
    this.elResultScorePraise = document.getElementById('result-score-praise');
    this.elResultTotalCount = document.getElementById('result-total-count');
    this.elResultCorrectCount = document.getElementById('result-correct-count');
    this.elResultWrongCount = document.getElementById('result-wrong-count');
    this.elResultTimeSpent = document.getElementById('result-time-spent');
    this.elWrongWordsContainer = document.getElementById('wrong-words-container');
    this.btnRetestWrongWords = document.getElementById('btn-retest-wrong-words');
    this.btnRetestAll = document.getElementById('btn-retest-all');
    this.btnViewRecordsFromResult = document.getElementById('btn-view-records-from-result');

    // 歷次紀錄 (Records)
    this.elStatTotalTests = document.getElementById('stat-total-tests');
    this.elStatAvgScore = document.getElementById('stat-avg-score');
    this.elStatTotalWrong = document.getElementById('stat-total-wrong');
    this.elRankingWrap = document.getElementById('ranking-pills-wrap');
    this.elHistoryList = document.getElementById('history-records-list');
    this.btnClearAllRecords = document.getElementById('btn-clear-all-records');

    // 題庫管理 (Banks)
    this.btnNewBank = document.getElementById('btn-new-bank');
    this.btnExportBanks = document.getElementById('btn-export-banks');
    this.fileImportInput = document.getElementById('file-import-input');
    this.elBankListContainer = document.getElementById('bank-list-container');
  }

  loadSettings() {
    try {
      // 優先載入專屬設定，若無則繼承 gifted_s_settings
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem('gifted_s_settings');
      if (saved) {
        this.settings = Object.assign(this.settings, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    this.applySettingsToUI();
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
      // 同步共用設定至 gifted_s_settings，確保跨 App 切換時偏好一致
      const common = {
        countdownSeconds: this.settings.countdownSeconds,
        gridType: this.settings.gridType,
        gridSize: this.settings.gridSize,
        speechRate: this.settings.speechRate,
        speechVolume: this.settings.speechVolume,
        voiceURI: this.settings.voiceURI,
        penOnly: this.settings.penOnly,
        soundEffects: this.settings.soundEffects
      };
      localStorage.setItem('gifted_s_settings', JSON.stringify(common));
    } catch (e) {}
    this.applySettingsToUI();
  }

  saveSettingsFromForm() {
    const inputTimer = document.getElementById('setting-timer');
    const selectGridSize = document.getElementById('setting-grid-size');
    const selectGridType = document.getElementById('setting-grid-type');
    const checkPenOnly = document.getElementById('setting-pen-only');
    const checkSound = document.getElementById('setting-sound');
    const selectRate = document.getElementById('setting-speech-rate');
    const selectVolume = document.getElementById('setting-speech-volume');
    const selectVoice = document.getElementById('setting-voice');
    const selectDefaultCount = document.getElementById('setting-default-count');
    const selectDefaultOrder = document.getElementById('setting-default-order');
    const selectDefaultTimer = document.getElementById('setting-default-timer');

    if (inputTimer) {
      let sec = parseInt(inputTimer.value, 10);
      if (isNaN(sec) || sec < 5) sec = 5;
      if (sec > 300) sec = 300;
      inputTimer.value = sec;
      this.settings.countdownSeconds = sec;
    }

    if (selectGridSize) this.settings.gridSize = selectGridSize.value;
    if (selectGridType) this.settings.gridType = selectGridType.value;
    if (checkPenOnly) this.settings.penOnly = checkPenOnly.checked;
    if (checkSound) this.settings.soundEffects = checkSound.checked;
    if (selectRate) this.settings.speechRate = parseFloat(selectRate.value) || 0.85;
    if (selectVolume) this.settings.speechVolume = parseFloat(selectVolume.value) || 1.0;
    if (selectVoice) this.settings.voiceURI = selectVoice.value;
    if (selectDefaultCount) this.settings.defaultQuestionCount = selectDefaultCount.value;
    if (selectDefaultOrder) this.settings.randomOrder = (selectDefaultOrder.value === 'random');
    if (selectDefaultTimer) this.settings.timerMode = selectDefaultTimer.value;

    this.saveSettings();

    // 即刻更新當前所有田字格畫布
    this.currentCanvases.forEach(c => {
      c.options.gridType = this.settings.gridType;
      c.options.penOnly = !!this.settings.penOnly;
      c.initCanvasSize();
      c.render();
    });

    sound.playSuccess();

    // 顯示成功提示訊息
    const saveMsg = document.getElementById('save-settings-msg');
    if (saveMsg) {
      saveMsg.style.display = 'inline-flex';
      clearTimeout(this.saveMsgTimeout);
      this.saveMsgTimeout = setTimeout(() => {
        saveMsg.style.display = 'none';
      }, 3500);
    }
  }

  applySettingsToUI() {
    let sizePx = '150px';
    if (this.settings.gridSize === 'compact') sizePx = '80px';
    if (this.settings.gridSize === 'large') sizePx = '200px';
    document.documentElement.style.setProperty('--grid-size', sizePx);

    speech.setRate(this.settings.speechRate);
    speech.setVolume(this.settings.speechVolume !== undefined ? this.settings.speechVolume : 1.0);
    if (this.settings.voiceURI) {
      speech.setVoice(this.settings.voiceURI);
    }
    sound.enabled = !!this.settings.soundEffects;

    // 設定面板控制項同步
    const inputTimer = document.getElementById('setting-timer');
    const selectGridSize = document.getElementById('setting-grid-size');
    const selectGridType = document.getElementById('setting-grid-type');
    const checkPenOnly = document.getElementById('setting-pen-only');
    const checkSound = document.getElementById('setting-sound');
    const selectRate = document.getElementById('setting-speech-rate');
    const selectVolume = document.getElementById('setting-speech-volume');
    const selectDefaultCount = document.getElementById('setting-default-count');
    const selectDefaultOrder = document.getElementById('setting-default-order');
    const selectDefaultTimer = document.getElementById('setting-default-timer');

    if (inputTimer && document.activeElement !== inputTimer) inputTimer.value = this.settings.countdownSeconds;
    if (selectGridSize) selectGridSize.value = this.settings.gridSize;
    if (selectGridType) selectGridType.value = this.settings.gridType;
    if (checkPenOnly) checkPenOnly.checked = !!this.settings.penOnly;
    if (checkSound) checkSound.checked = !!this.settings.soundEffects;
    if (selectRate) selectRate.value = this.settings.speechRate;
    if (selectVolume) selectVolume.value = String(this.settings.speechVolume || 1.0);
    if (selectDefaultCount) selectDefaultCount.value = this.settings.defaultQuestionCount || '20';
    if (selectDefaultOrder) selectDefaultOrder.value = this.settings.randomOrder ? 'random' : 'order';
    if (selectDefaultTimer) selectDefaultTimer.value = this.settings.timerMode || 'none';

    // 同步測驗首頁 (view-start) 下拉選單為上一次/預設設定
    if (this.selectStartCount) this.selectStartCount.value = this.settings.defaultQuestionCount || '20';
    if (this.selectStartOrder) this.selectStartOrder.value = this.settings.randomOrder ? 'random' : 'order';
    if (this.selectStartTimer) this.selectStartTimer.value = this.settings.timerMode || 'none';

    this.populateVoiceList();
  }

  populateVoiceList() {
    const selectVoice = document.getElementById('setting-voice');
    if (!selectVoice) return;
    const voices = speech.getChineseVoices();
    const currentVal = this.settings.voiceURI || (speech.twVoice ? speech.twVoice.voiceURI : '');

    selectVoice.innerHTML = '<option value="">自動推薦 (優先臺灣人聲)</option>';
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.voiceURI === currentVal) opt.selected = true;
      selectVoice.appendChild(opt);
    });
  }

  initTimerCallbacks() {
    this.timer.onTick = (timeVal) => {
      if (this.elTimerText) {
        this.elTimerText.textContent = this.timer.formatTime(timeVal);
      }
      if (this.timer.isCountdown && timeVal <= 10) {
        this.elTimerPill?.classList.add('warning');
      } else {
        this.elTimerPill?.classList.remove('warning');
      }
    };

    this.timer.onTimeout = () => {
      if (this.settings.timerMode === 'total') {
        alert('⏱️ 全卷測驗總時間結束！將為您自動交卷總覽檢查。');
        this.handleEnterReview();
      } else if (this.settings.timerMode === 'per_question') {
        alert('⏱️ 本題作答時間結束！自動進入下一題。');
        this.handleNextQuestion();
      }
    };
  }

  bindEvents() {
    // 頂欄分頁切換
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playTap();
        const view = btn.dataset.view;
        if (view === 'quiz') {
          if (this.activeExam.questions.length > 0) {
            this.switchView('quiz');
          } else {
            this.showStartScreen();
          }
        } else if (view === 'records') {
          this.showRecordsScreen();
        } else if (view === 'banks') {
          this.showBanksScreen();
        } else if (view === 'settings') {
          this.switchView('settings');
        }
      });
    });

    // 測驗設定主頁 (Start)
    if (this.btnStartExam) {
      this.btnStartExam.addEventListener('click', () => {
        sound.playTap();
        this.startNewExam();
      });
    }
    if (this.btnViewRecordsDirect) {
      this.btnViewRecordsDirect.addEventListener('click', () => {
        sound.playTap();
        this.showRecordsScreen();
      });
    }

    // 聽寫作答區 (Quiz)
    if (this.btnPlayVoice) {
      this.btnPlayVoice.addEventListener('click', () => {
        this.handlePlayVoice();
      });
    }

    if (this.btnClearCanvas) {
      this.btnClearCanvas.addEventListener('click', () => {
        sound.playTap();
        this.currentCanvases.forEach(c => c.clear());
      });
    }

    if (this.btnUndoStroke) {
      this.btnUndoStroke.addEventListener('click', () => {
        sound.playTap();
        this.currentCanvases.forEach(c => c.undo());
      });
    }

    if (this.btnQuizPrev) {
      this.btnQuizPrev.addEventListener('click', () => {
        sound.playTap();
        if (this.activeExam.currentIndex > 0) {
          this.saveCurrentQuestionHandwriting();
          this.loadQuestion(this.activeExam.currentIndex - 1);
        }
      });
    }

    if (this.btnQuizNext) {
      this.btnQuizNext.addEventListener('click', () => {
        sound.playTap();
        this.handleNextQuestion();
      });
    }

    if (this.btnQuizSubmitHead) {
      this.btnQuizSubmitHead.addEventListener('click', () => {
        sound.playTap();
        this.handleEnterReview();
      });
    }

    if (this.btnFinishEdit) {
      this.btnFinishEdit.addEventListener('click', () => {
        sound.playTap();
        this.saveCurrentQuestionHandwriting();
        this.handleEnterReview();
      });
    }

    // 交卷總覽 (Review)
    if (this.btnReviewBack) {
      this.btnReviewBack.addEventListener('click', () => {
        sound.playTap();
        this.switchView('quiz');
        this.loadQuestion(this.activeExam.currentIndex);
      });
    }

    if (this.btnConfirmSubmit) {
      this.btnConfirmSubmit.addEventListener('click', () => {
        sound.playTap();
        this.handleConfirmSubmit();
      });
    }

    // 逐題批改 (Grading)
    if (this.btnFinishGrading) {
      this.btnFinishGrading.addEventListener('click', () => {
        sound.playTap();
        this.finishGradingAndSave();
      });
    }

    // 結算結果 (Result)
    if (this.btnRetestWrongWords) {
      this.btnRetestWrongWords.addEventListener('click', () => {
        sound.playTap();
        this.retestWrongWords();
      });
    }

    if (this.btnRetestAll) {
      this.btnRetestAll.addEventListener('click', () => {
        sound.playTap();
        this.startNewExam();
      });
    }

    if (this.btnViewRecordsFromResult) {
      this.btnViewRecordsFromResult.addEventListener('click', () => {
        sound.playTap();
        this.showRecordsScreen();
      });
    }

    // 歷次紀錄 (Records)
    if (this.btnClearAllRecords) {
      this.btnClearAllRecords.addEventListener('click', () => {
        if (confirm('確定要清空所有的測驗歷史紀錄嗎？清空後無法復原。')) {
          sound.playTap();
          recordsManager.clearAll();
          this.showRecordsScreen();
        }
      });
    }

    // 題庫管理按鈕
    if (this.btnNewBank) {
      this.btnNewBank.addEventListener('click', () => this.handleNewBankModal());
    }
    if (this.btnExportBanks) {
      this.btnExportBanks.addEventListener('click', () => bankManager.exportJSON());
    }
    if (this.fileImportInput) {
      this.fileImportInput.addEventListener('change', (e) => this.handleImportBanks(e));
    }

    // 儲存設定按鈕 (使用者建議 1：設定好之後，要有儲存按鈕)
    const btnSaveSettings = document.getElementById('btn-save-settings');
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        this.saveSettingsFromForm();
      });
    }

    // 試聽發音按鈕
    const btnTestVoice = document.getElementById('btn-test-voice');
    if (btnTestVoice) {
      btnTestVoice.addEventListener('click', () => {
        sound.playTap();
        const selectVoice = document.getElementById('setting-voice');
        if (selectVoice && selectVoice.value) {
          speech.setVoice(selectVoice.value);
        }
        const selectRate = document.getElementById('setting-speech-rate');
        if (selectRate) {
          speech.setRate(parseFloat(selectRate.value) || 0.85);
        }
        const selectVolume = document.getElementById('setting-speech-volume');
        if (selectVolume) {
          speech.setVolume(parseFloat(selectVolume.value) || 1.0);
        }
        speech.speak('這是國語生字聽寫測驗的標準發音測試。');
      });
    }

    // 設定表單各控制項變更時自動同步
    const inputTimer = document.getElementById('setting-timer');
    if (inputTimer) {
      inputTimer.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        if (val >= 5 && val <= 300) {
          this.settings.countdownSeconds = val;
          this.saveSettings();
        }
      });
    }

    const selectGridSize = document.getElementById('setting-grid-size');
    if (selectGridSize) {
      selectGridSize.addEventListener('change', (e) => {
        this.settings.gridSize = e.target.value;
        this.saveSettings();
      });
    }

    const selectGridType = document.getElementById('setting-grid-type');
    if (selectGridType) {
      selectGridType.addEventListener('change', (e) => {
        this.settings.gridType = e.target.value;
        this.saveSettings();
      });
    }

    const checkPenOnly = document.getElementById('setting-pen-only');
    if (checkPenOnly) {
      checkPenOnly.addEventListener('change', (e) => {
        this.settings.penOnly = e.target.checked;
        this.saveSettings();
      });
    }

    const checkSound = document.getElementById('setting-sound');
    if (checkSound) {
      checkSound.addEventListener('change', (e) => {
        this.settings.soundEffects = e.target.checked;
        this.saveSettings();
      });
    }

    const selectRate = document.getElementById('setting-speech-rate');
    if (selectRate) {
      selectRate.addEventListener('change', (e) => {
        this.settings.speechRate = parseFloat(e.target.value) || 0.85;
        this.saveSettings();
      });
    }

    const selectVolume = document.getElementById('setting-speech-volume');
    if (selectVolume) {
      selectVolume.addEventListener('change', (e) => {
        this.settings.speechVolume = parseFloat(e.target.value) || 1.0;
        this.saveSettings();
      });
    }

    const selectVoice = document.getElementById('setting-voice');
    if (selectVoice) {
      selectVoice.addEventListener('change', (e) => {
        this.settings.voiceURI = e.target.value;
        this.saveSettings();
      });
    }

    const selectDefaultCount = document.getElementById('setting-default-count');
    if (selectDefaultCount) {
      selectDefaultCount.addEventListener('change', (e) => {
        this.settings.defaultQuestionCount = e.target.value;
        this.saveSettings();
      });
    }

    const selectDefaultOrder = document.getElementById('setting-default-order');
    if (selectDefaultOrder) {
      selectDefaultOrder.addEventListener('change', (e) => {
        this.settings.randomOrder = (e.target.value === 'random');
        this.saveSettings();
      });
    }

    const selectDefaultTimer = document.getElementById('setting-default-timer');
    if (selectDefaultTimer) {
      selectDefaultTimer.addEventListener('change', (e) => {
        this.settings.timerMode = e.target.value;
        this.saveSettings();
      });
    }
  }

  switchView(viewName) {
    speech.stop();
    Object.keys(this.views).forEach(key => {
      if (this.views[key]) {
        this.views[key].classList.toggle('active', key === viewName);
      }
    });

    this.navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
  }

  // ================= 測驗主頁與準備 =================
  showStartScreen() {
    this.switchView('start');

    // 填充題庫下拉選單
    if (this.selectStartBank) {
      const banks = bankManager.getBanks();
      const activeBank = bankManager.getActiveBank();
      this.selectStartBank.innerHTML = '';
      banks.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.name} (${b.words.length}字詞)`;
        if (activeBank && activeBank.id === b.id) opt.selected = true;
        this.selectStartBank.appendChild(opt);
      });
    }

    // 每次開啟時，精確還原上一次的設定 (使用者建議 2)
    if (this.selectStartCount) {
      this.selectStartCount.value = this.settings.defaultQuestionCount || '20';
    }
    if (this.selectStartOrder) {
      this.selectStartOrder.value = this.settings.randomOrder ? 'random' : 'order';
    }
    if (this.selectStartTimer) {
      this.selectStartTimer.value = this.settings.timerMode || 'none';
    }
  }

  startNewExam(customWords = null, customBankName = null) {
    let words = [];
    let bankName = '';

    if (customWords && customWords.length > 0) {
      words = [...customWords];
      bankName = customBankName || '錯題重測專區';
    } else {
      const bankId = this.selectStartBank ? this.selectStartBank.value : null;
      if (bankId) bankManager.setActiveBank(bankId);
      const bank = bankManager.getActiveBank();

      if (!bank || !bank.words || bank.words.length === 0) {
        alert('選擇的題庫沒有生字，請先至「題庫管理」新增生字詞語！');
        this.showBanksScreen();
        return;
      }

      bankName = bank.name;
      words = [...bank.words];

      // 順序或隨機 (自動儲存當前設定，下次開啟保持)
      const isRandom = this.selectStartOrder ? (this.selectStartOrder.value === 'random') : this.settings.randomOrder;
      this.settings.randomOrder = isRandom;

      if (isRandom) {
        for (let i = words.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [words[i], words[j]] = [words[j], words[i]];
        }
      }

      // 題數截取 (自動儲存當前設定，下次開啟保持)
      const countVal = this.selectStartCount ? this.selectStartCount.value : '20';
      this.settings.defaultQuestionCount = countVal;

      if (countVal !== 'all') {
        const limit = parseInt(countVal, 10) || 20;
        if (words.length > limit) {
          words = words.slice(0, limit);
        }
      }

      // 計時模式選擇 (自動儲存當前設定，下次開啟保持)
      const timerMode = this.selectStartTimer ? this.selectStartTimer.value : this.settings.timerMode;
      this.settings.timerMode = timerMode;

      // 自動持久化儲存偏好
      this.saveSettings();
    }

    // 初始化測驗題目結構
    this.activeExam = {
      bankName: bankName,
      questions: words.map((w, idx) => ({
        index: idx,
        word: w,
        chars: w.split(''),
        strokes: [], // 每個字的筆劃陣列
        hasWritten: false,
        snapshot: null,
        isCorrect: true // 批改時預設正確
      })),
      currentIndex: 0,
      isEditingFromReview: false,
      startTime: Date.now(),
      totalTimeSec: 0
    };

    // 計時器設定
    const timerMode = this.selectStartTimer ? this.selectStartTimer.value : this.settings.timerMode;
    this.settings.timerMode = timerMode;

    if (timerMode === 'total') {
      const totalSec = (this.settings.totalMinutes || 10) * 60;
      this.timer.setMode(totalSec, true);
      this.timer.start();
    } else if (timerMode === 'per_question') {
      this.timer.setMode(this.settings.countdownSeconds || 30, true);
    } else {
      // 不限時 (正向計時)
      this.timer.setMode(0, false);
      this.timer.start();
    }

    if (this.elQuizBankBadge) {
      this.elQuizBankBadge.textContent = bankName;
    }

    this.switchView('quiz');
    this.loadQuestion(0);
  }

  // ================= 聽寫作答階段 (Quiz) =================
  loadQuestion(index) {
    if (index < 0 || index >= this.activeExam.questions.length) return;
    this.activeExam.currentIndex = index;
    const q = this.activeExam.questions[index];
    const total = this.activeExam.questions.length;

    // 更新進度與按鈕文字
    if (this.elQuizProgress) {
      this.elQuizProgress.textContent = `第 ${index + 1} 題 / 共 ${total} 題`;
    }

    if (this.btnQuizPrev) {
      this.btnQuizPrev.disabled = (index === 0);
    }

    if (this.btnQuizNext) {
      this.btnQuizNext.textContent = (index === total - 1) ? '檢查交卷 📋' : '下一題 ➔';
    }

    // 檢查是否為修改模式
    if (this.activeExam.isEditingFromReview) {
      this.elEditingBanner?.classList.add('visible');
      if (this.elEditingQNum) this.elEditingQNum.textContent = index + 1;
    } else {
      this.elEditingBanner?.classList.remove('visible');
    }

    // 更新題目導航滑動列
    this.renderPillStrip();

    // 構建手寫田字格
    this.elGridContainer.innerHTML = '';
    this.currentCanvases = [];

    q.chars.forEach((char, charIdx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tian-cell-wrapper';

      const box = document.createElement('div');
      box.className = 'tian-canvas-box';

      const canvasEl = document.createElement('canvas');
      canvasEl.className = 'handwriting-canvas';

      box.appendChild(canvasEl);
      wrapper.appendChild(box);

      if (q.chars.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'cell-index-badge';
        badge.textContent = `第 ${charIdx + 1} 字`;
        wrapper.appendChild(badge);
      }

      this.elGridContainer.appendChild(wrapper);

      // 實例化田字格
      const tianCanvas = new TianZiGeCanvas(canvasEl, {
        gridType: this.settings.gridType,
        penOnly: !!this.settings.penOnly,
        onStrokeEnd: () => {
          q.hasWritten = true;
          this.updateCurrentPillStatus();
        }
      });

      // 若該字先前已有暫存筆劃，完整復原！
      if (q.strokes && q.strokes[charIdx]) {
        tianCanvas.setStrokes(q.strokes[charIdx]);
      }

      this.currentCanvases.push(tianCanvas);
    });

    // 尺寸校正
    setTimeout(() => {
      this.currentCanvases.forEach(c => {
        c.initCanvasSize();
        c.render();
      });
    }, 40);

    // 單題倒數計時器重置
    if (this.settings.timerMode === 'per_question') {
      this.timer.reset();
      this.timer.start();
    }
  }

  saveCurrentQuestionHandwriting() {
    const q = this.activeExam.questions[this.activeExam.currentIndex];
    if (!q) return;

    // 提取筆劃
    q.strokes = this.currentCanvases.map(c => c.getStrokes());
    q.hasWritten = this.currentCanvases.some(c => c.hasContent());

    // 產生合併縮圖以供總覽與評分展示
    q.snapshot = this.generateCompositeSnapshot();
  }

  generateCompositeSnapshot() {
    if (!this.currentCanvases || this.currentCanvases.length === 0) return null;
    if (this.currentCanvases.length === 1) {
      return this.currentCanvases[0].toDataURL();
    }

    try {
      const offCanvas = document.createElement('canvas');
      const offCtx = offCanvas.getContext('2d');
      const firstCanvas = this.currentCanvases[0].canvas;
      const w = firstCanvas.width;
      const h = firstCanvas.height;
      const gap = 14;

      offCanvas.width = (w * this.currentCanvases.length) + (gap * (this.currentCanvases.length - 1));
      offCanvas.height = h;

      this.currentCanvases.forEach((c, idx) => {
        offCtx.drawImage(c.canvas, idx * (w + gap), 0);
      });

      return offCanvas.toDataURL('image/png');
    } catch (e) {
      return this.currentCanvases[0].toDataURL();
    }
  }

  renderPillStrip() {
    if (!this.elPillStrip) return;
    this.elPillStrip.innerHTML = '';

    this.activeExam.questions.forEach((q, idx) => {
      const pill = document.createElement('div');
      pill.className = `exam-pill ${idx === this.activeExam.currentIndex ? 'active' : ''} ${q.hasWritten ? 'written' : ''}`;
      pill.textContent = idx + 1;

      pill.addEventListener('click', () => {
        sound.playTap();
        this.saveCurrentQuestionHandwriting();
        this.loadQuestion(idx);
      });

      this.elPillStrip.appendChild(pill);
    });

    // 自動捲動至當前題號
    const activePill = this.elPillStrip.children[this.activeExam.currentIndex];
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  updateCurrentPillStatus() {
    if (!this.elPillStrip) return;
    const activePill = this.elPillStrip.children[this.activeExam.currentIndex];
    if (activePill) {
      activePill.classList.add('written');
    }
  }

  handlePlayVoice() {
    const q = this.activeExam.questions[this.activeExam.currentIndex];
    if (!q) return;

    this.btnPlayVoice?.classList.add('speaking');
    speech.speak(
      q.word,
      () => this.btnPlayVoice?.classList.add('speaking'),
      () => this.btnPlayVoice?.classList.remove('speaking')
    );
  }

  handleNextQuestion() {
    this.saveCurrentQuestionHandwriting();

    if (this.activeExam.currentIndex < this.activeExam.questions.length - 1) {
      this.loadQuestion(this.activeExam.currentIndex + 1);
    } else {
      // 最後一題點擊 -> 進入交卷總覽
      this.handleEnterReview();
    }
  }

  // ================= 流程 1 & 2: 交卷前總覽與個別修改 =================
  handleEnterReview() {
    this.saveCurrentQuestionHandwriting();
    this.activeExam.isEditingFromReview = false;
    this.switchView('review');

    const total = this.activeExam.questions.length;
    const writtenCount = this.activeExam.questions.filter(q => q.hasWritten).length;
    const unwrittenCount = total - writtenCount;

    if (this.elReviewStatBadge) {
      this.elReviewStatBadge.textContent = `已完成：${writtenCount} / ${total} 題`;
      if (unwrittenCount > 0) {
        this.elReviewStatBadge.style.borderColor = '#fdba74';
        this.elReviewStatBadge.style.color = '#c2410c';
      } else {
        this.elReviewStatBadge.style.borderColor = '#86efac';
        this.elReviewStatBadge.style.color = '#166534';
      }
    }

    if (this.elReviewGrid) {
      this.elReviewGrid.innerHTML = '';

      this.activeExam.questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = `review-card ${q.hasWritten ? '' : 'unwritten'}`;

        card.innerHTML = `
          <div class="review-card-top">
            <span class="review-card-idx">第 ${idx + 1} 題</span>
            <span class="review-status-pill ${q.hasWritten ? 'written' : 'unwritten'}">
              ${q.hasWritten ? '✅ 已書寫' : '⚠️ 未書寫'}
            </span>
          </div>
          <div class="review-canvas-container">
            ${q.snapshot 
              ? `<img src="${q.snapshot}" class="review-canvas-img" alt="第${idx + 1}題手寫字跡">` 
              : '<span class="review-empty-text">未書寫筆跡</span>'}
          </div>
          <button class="btn-card-modify" data-index="${idx}">
            <span>✏️ 修改此題</span>
          </button>
        `;

        const btnModify = card.querySelector('.btn-card-modify');
        btnModify.addEventListener('click', () => {
          sound.playTap();
          this.activeExam.isEditingFromReview = true;
          this.switchView('quiz');
          this.loadQuestion(idx);
        });

        this.elReviewGrid.appendChild(card);
      });
    }
  }

  // ================= 流程 3: 確定交卷後批改評分 =================
  handleConfirmSubmit() {
    const unwrittenCount = this.activeExam.questions.filter(q => !q.hasWritten).length;
    if (unwrittenCount > 0) {
      if (!confirm(`尚有 ${unwrittenCount} 題未書寫筆跡，確定要交卷評分嗎？`)) {
        return;
      }
    }

    // 停止計時
    this.timer.stop();
    this.activeExam.totalTimeSec = Math.max(1, Math.round((Date.now() - this.activeExam.startTime) / 1000));

    this.showGradingScreen();
  }

  showGradingScreen() {
    this.switchView('grading');
    this.updateGradingScoreBanner();

    if (this.elGradingList) {
      this.elGradingList.innerHTML = '';

      this.activeExam.questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = `grading-card ${q.isCorrect ? 'is-correct' : 'is-wrong'}`;

        card.innerHTML = `
          <div class="grading-card-top">
            <span class="grading-card-idx">第 ${idx + 1} 題</span>
            <button class="tool-btn btn-pronounce" style="padding: 4px 10px; font-size: 0.85rem;" data-word="${q.word}">
              <span>🔊 聽發音</span>
            </button>
          </div>
          <div class="grading-content-row">
            <!-- 標準答案 (楷體國字) -->
            <div class="grading-box">
              <span class="grading-box-label">標準楷體國字</span>
              <span class="grading-standard-word font-kai">${q.word}</span>
            </div>
            <!-- 學生手寫字跡 -->
            <div class="grading-box">
              <span class="grading-box-label">學生手寫筆跡</span>
              ${q.snapshot 
                ? `<img src="${q.snapshot}" class="grading-handwriting-img" alt="手寫筆劃">`
                : '<span style="color: #94a3b8; font-weight: 600;">未作答</span>'}
            </div>
          </div>
          <div class="grading-actions-row">
            <button class="btn-grade-opt correct ${q.isCorrect ? 'active' : ''}" data-index="${idx}">
              <span>✔ 正確</span>
            </button>
            <button class="btn-grade-opt wrong ${!q.isCorrect ? 'active' : ''}" data-index="${idx}">
              <span>✖ 打叉</span>
            </button>
          </div>
        `;

        // 發音按鈕
        const btnVoice = card.querySelector('.btn-pronounce');
        btnVoice.addEventListener('click', () => {
          speech.speak(q.word);
        });

        // 評分按鈕 (打勾 / 打叉)
        const btnCorrect = card.querySelector('.btn-grade-opt.correct');
        const btnWrong = card.querySelector('.btn-grade-opt.wrong');

        btnCorrect.addEventListener('click', () => {
          sound.playCorrect();
          q.isCorrect = true;
          btnCorrect.classList.add('active');
          btnWrong.classList.remove('active');
          card.classList.add('is-correct');
          card.classList.remove('is-wrong');
          this.updateGradingScoreBanner();
        });

        btnWrong.addEventListener('click', () => {
          sound.playWrong();
          q.isCorrect = false;
          btnWrong.classList.add('active');
          btnCorrect.classList.remove('active');
          card.classList.add('is-wrong');
          card.classList.remove('is-correct');
          this.updateGradingScoreBanner();
        });

        this.elGradingList.appendChild(card);
      });
    }
  }

  updateGradingScoreBanner() {
    const total = this.activeExam.questions.length;
    const correctCount = this.activeExam.questions.filter(q => q.isCorrect).length;
    const wrongCount = total - correctCount;
    const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    if (this.elGradingLiveScore) {
      this.elGradingLiveScore.textContent = `目前得分: ${scorePct} 分`;
    }
    if (this.elGradeCorrectCount) {
      this.elGradeCorrectCount.textContent = `✔ 正確: ${correctCount} 題`;
    }
    if (this.elGradeWrongCount) {
      this.elGradeWrongCount.textContent = `✖ 打叉: ${wrongCount} 題`;
    }
  }

  // ================= 流程 4: 評分完成並記錄打叉錯題 =================
  finishGradingAndSave() {
    const total = this.activeExam.questions.length;
    const correctCount = this.activeExam.questions.filter(q => q.isCorrect).length;
    const wrongQuestions = this.activeExam.questions.filter(q => !q.isCorrect);
    const wrongWords = wrongQuestions.map(q => q.word);
    const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // 持久化保存至 LocalStorage (依指示：不存筆跡圖片，只記錄該題文字與對錯狀態！)
    recordsManager.addRecord({
      bankName: this.activeExam.bankName,
      totalCount: total,
      correctCount: correctCount,
      wrongCount: wrongWords.length,
      score: scorePct,
      wrongWords: wrongWords,
      items: this.activeExam.questions.map(q => ({
        word: q.word,
        isCorrect: q.isCorrect
      }))
    });

    this.showResultScreen(scorePct, correctCount, total, wrongWords);
  }

  showResultScreen(scorePct, correctCount, total, wrongWords) {
    this.switchView('result');

    if (scorePct === 100) {
      sound.playFanfare();
    } else if (scorePct >= 80) {
      sound.playSuccess();
    } else {
      sound.playCorrect();
    }

    if (this.elResultScoreNum) this.elResultScoreNum.textContent = `${scorePct} 分`;
    if (this.elResultTotalCount) this.elResultTotalCount.textContent = `共 ${total} 題`;
    if (this.elResultCorrectCount) this.elResultCorrectCount.textContent = `答對 ${correctCount} 題`;
    if (this.elResultWrongCount) this.elResultWrongCount.textContent = `打叉 ${wrongWords.length} 題`;
    if (this.elResultTimeSpent) this.elResultTimeSpent.textContent = `用時 ${this.activeExam.totalTimeSec} 秒`;

    if (this.elResultScorePraise) {
      if (scorePct === 100) {
        this.elResultScorePraise.textContent = '🌟 太厲害了！滿分全對，字跡工整無懈可擊！';
      } else if (scorePct >= 80) {
        this.elResultScorePraise.textContent = '👏 表現優異！把打叉的生字多看一眼就更棒了！';
      } else {
        this.elResultScorePraise.textContent = '💪 繼續加油！多練習幾次一定會越來越熟練！';
      }
    }

    // 錯題文字呈現
    if (this.elWrongWordsContainer) {
      this.elWrongWordsContainer.innerHTML = '';

      if (wrongWords.length === 0) {
        this.elWrongWordsContainer.innerHTML = `
          <div class="no-wrong-box">
            🎉 恭喜！本次測驗全對，完全沒有打叉的錯字！
          </div>
        `;
        if (this.btnRetestWrongWords) this.btnRetestWrongWords.style.display = 'none';
      } else {
        const grid = document.createElement('div');
        grid.className = 'wrong-words-grid';

        wrongWords.forEach(w => {
          const chip = document.createElement('span');
          chip.className = 'wrong-word-chip font-kai';
          chip.textContent = `❌ ${w}`;
          grid.appendChild(chip);
        });

        this.elWrongWordsContainer.appendChild(grid);

        if (this.btnRetestWrongWords) {
          this.btnRetestWrongWords.style.display = 'inline-flex';
          this.btnRetestWrongWords.textContent = `🎯 立即測驗本次錯題 (共 ${wrongWords.length} 題)`;
        }
      }
    }
  }

  retestWrongWords(customList = null) {
    const wrongWords = customList || this.activeExam.questions.filter(q => !q.isCorrect).map(q => q.word);
    if (wrongWords.length === 0) {
      alert('沒有錯題需要重測！');
      return;
    }

    this.startNewExam(wrongWords, `錯題專項測驗 (${wrongWords.length}題)`);
  }

  // ================= 歷次紀錄與錯題本 =================
  showRecordsScreen() {
    this.switchView('records');
    const stats = recordsManager.getOverallStats();

    if (this.elStatTotalTests) this.elStatTotalTests.textContent = stats.totalTests;
    if (this.elStatAvgScore) this.elStatAvgScore.textContent = `${stats.avgScore} 分`;
    if (this.elStatTotalWrong) this.elStatTotalWrong.textContent = `${stats.totalWrongCount} 題`;

    // 高頻易錯字排行榜
    if (this.elRankingWrap) {
      this.elRankingWrap.innerHTML = '';
      const topWrongs = recordsManager.getTopWrongWords(12);

      if (topWrongs.length === 0) {
        this.elRankingWrap.innerHTML = '<span style="color: #94a3b8; font-weight: 600;">尚無錯題紀錄，繼續保持！</span>';
      } else {
        topWrongs.forEach(item => {
          const pill = document.createElement('div');
          pill.className = 'ranking-pill';
          pill.innerHTML = `
            <span class="font-kai">${item.word}</span>
            <span class="ranking-count-tag">${item.count}次</span>
          `;
          this.elRankingWrap.appendChild(pill);
        });
      }
    }

    // 歷次詳細測驗清單
    if (this.elHistoryList) {
      this.elHistoryList.innerHTML = '';
      const records = recordsManager.getRecords();

      if (records.length === 0) {
        this.elHistoryList.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #94a3b8; font-weight: 600;">
            目前尚無歷次測驗紀錄，點擊「聽寫測驗」開始第一回測驗吧！
          </div>
        `;
        return;
      }

      records.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'history-record-card';

        let badgeClass = 'good';
        if (rec.score === 100) badgeClass = 'perfect';
        if (rec.score < 80) badgeClass = 'warn';

        const wrongPillsHtml = (rec.wrongWords && rec.wrongWords.length > 0)
          ? rec.wrongWords.map(w => `<span class="record-wrong-pill font-kai">❌ ${w}</span>`).join('')
          : '<span style="color: #16a34a; font-weight: 700; font-size: 0.95rem;">💯 全對無打叉</span>';

        card.innerHTML = `
          <div class="record-top-row">
            <div>
              <span class="record-date">${rec.dateStr}</span>
              <span class="record-bank" style="margin-left: 8px;">${rec.bankName}</span>
            </div>
            <span class="record-score-badge ${badgeClass}">${rec.score} 分 (${rec.correctCount}/${rec.totalCount})</span>
          </div>
          <div class="record-wrong-words-box">
            <span class="record-wrong-label">錯題紀錄：</span>
            ${wrongPillsHtml}
          </div>
          <div class="record-actions-row">
            ${(rec.wrongWords && rec.wrongWords.length > 0) 
              ? `<button class="tool-btn btn-retest-rec" style="font-size: 0.85rem; padding: 5px 12px; color: var(--primary);">
                   <span>🎯 重練這筆錯題</span>
                 </button>` 
              : ''}
            <button class="tool-btn danger btn-delete-rec" style="font-size: 0.85rem; padding: 5px 12px;">
              <span>🗑️ 刪除紀錄</span>
            </button>
          </div>
        `;

        const btnDel = card.querySelector('.btn-delete-rec');
        btnDel.addEventListener('click', () => {
          if (confirm('確定要刪除這筆紀錄嗎？')) {
            sound.playTap();
            recordsManager.deleteRecord(rec.id);
            this.showRecordsScreen();
          }
        });

        const btnRetest = card.querySelector('.btn-retest-rec');
        if (btnRetest) {
          btnRetest.addEventListener('click', () => {
            sound.playTap();
            this.retestWrongWords(rec.wrongWords);
          });
        }

        this.elHistoryList.appendChild(card);
      });
    }
  }

  // ================= 題庫管理 (Banks) =================
  showBanksScreen() {
    this.switchView('banks');
    this.renderBankList();
  }

  renderBankList() {
    if (!this.elBankListContainer) return;
    this.elBankListContainer.innerHTML = '';

    const banks = bankManager.getBanks();
    const activeBank = bankManager.getActiveBank();

    banks.forEach(bank => {
      const card = document.createElement('div');
      card.className = `bank-card ${activeBank && activeBank.id === bank.id ? 'active' : ''}`;

      card.innerHTML = `
        <div>
          <div class="bank-title-row">
            <span class="bank-name">${bank.name}</span>
            <span class="bank-badge">${bank.words.length} 題</span>
          </div>
          <p class="bank-words-preview font-kai" style="margin-top: 10px;">${bank.words.join('、')}</p>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;">
          <button class="tool-btn btn-edit-bank">編輯</button>
          <button class="tool-btn danger btn-del-bank">刪除</button>
          <button class="tool-btn primary btn-select-bank">${activeBank && activeBank.id === bank.id ? '目前使用' : '選用'}</button>
        </div>
      `;

      card.querySelector('.btn-select-bank').addEventListener('click', () => {
        sound.playTap();
        bankManager.setActiveBank(bank.id);
        this.renderBankList();
      });

      card.querySelector('.btn-edit-bank').addEventListener('click', () => {
        sound.playTap();
        this.handleEditBankModal(bank);
      });

      card.querySelector('.btn-del-bank').addEventListener('click', () => {
        sound.playTap();
        if (confirm(`確定要刪除題庫「${bank.name}」嗎？`)) {
          bankManager.deleteBank(bank.id);
          this.renderBankList();
        }
      });

      this.elBankListContainer.appendChild(card);
    });
  }

  handleNewBankModal() {
    const name = prompt('請輸入新題庫名稱：', '自訂生字題庫');
    if (!name) return;

    const rawWords = prompt('請輸入生字或詞語（每個詞語以空格、逗號或換行隔開）：\n例如：學校 老師 同學 讀書');
    if (!rawWords) return;

    const newBank = bankManager.addBank(name, rawWords);
    if (newBank) {
      alert(`已成功建立「${newBank.name}」，共 ${newBank.words.length} 題！`);
      this.renderBankList();
    } else {
      alert('建立失敗，生字內容不可為空！');
    }
  }

  handleEditBankModal(bank) {
    const name = prompt('修改題庫名稱：', bank.name);
    if (!name) return;

    const rawWords = prompt('修改詞語（以空格、逗號或換行隔開）：', bank.words.join(' '));
    if (!rawWords) return;

    if (bankManager.updateBank(bank.id, name, rawWords)) {
      alert('題庫更新成功！');
      this.renderBankList();
    }
  }

  handleImportBanks(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (bankManager.importJSON(event.target.result)) {
        alert('題庫匯入成功！');
        this.renderBankList();
      } else {
        alert('匯入失敗，請確認檔案格式是否為合法的 JSON 題庫檔案。');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }
}

// 實例化啟動
window.addEventListener('DOMContentLoaded', () => {
  window.examApp = new ExamAppController();
});


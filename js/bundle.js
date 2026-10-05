// === 音效模組 ===
/**
 * Web Audio API 音效生成器 (無須外部音檔，100% 離線可用)
 */
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** 倒數最後5秒的嗶聲提示 */
  playTick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio tick failed:', e);
    }
  }

  /** 30秒倒數結束的提示音 (雙音短鳴) */
  playTimesUp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(392.00, now + 0.15); // G4

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio times-up failed:', e);
    }
  }

  /** 測驗完成的歡呼慶祝音效 (C和弦琶音) */
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
        osc.frequency.setValueAtTime(freq, start + idx * 0.12);

        gain.gain.setValueAtTime(0.25, start + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, start + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start + idx * 0.12);
        osc.stop(start + idx * 0.12 + 0.35);
      });
    } catch (e) {
      console.warn('Audio success failed:', e);
    }
  }
}

const sound = new SoundEffects();


// === 語音模組 ===
/**
 * Web Speech API 國語發音模組 (支援 iPad Safari 原生 zh-TW 高品質語音)
 */
class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.twVoice = null;
    this.rate = 0.85; // 稍慢語速，適合聽寫
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
    
    // 優先尋找臺灣國語語音 (zh-TW, cmn-Hant-TW, 包含 Siri / 美佳 / 漢漢 / Google 國語)
    this.twVoice = this.voices.find(v => 
      v.lang === 'zh-TW' || 
      v.lang === 'cmn-Hant-TW' || 
      v.lang.replace('_', '-').toLowerCase() === 'zh-tw'
    ) || this.voices.find(v => v.lang.startsWith('zh'));
  }

  setRate(val) {
    this.rate = Math.max(0.5, Math.min(1.5, parseFloat(val) || 0.85));
  }

  /**
   * 朗讀詞語
   * @param {string} text 要朗讀的國字/詞語
   * @param {Function} onStart 開始朗讀回呼
   * @param {Function} onEnd 朗讀結束回呼
   */
  speak(text, onStart = null, onEnd = null) {
    if (!this.synth) {
      alert('您的瀏覽器不支援語音朗讀功能');
      if (onEnd) onEnd();
      return;
    }

    // 若正在播放，先取消
    if (this.synth.speaking) {
      this.synth.cancel();
    }

    if (!this.twVoice) {
      this.loadVoices();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.twVoice) {
      utterance.voice = this.twVoice;
      utterance.lang = this.twVoice.lang;
    } else {
      utterance.lang = 'zh-TW';
    }

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
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
 * 測驗倒數計時器
 */
class QuizTimer {
  constructor(defaultSeconds = 30) {
    this.totalSeconds = defaultSeconds;
    this.remainingSeconds = defaultSeconds;
    this.intervalId = null;
    this.isRunning = false;
    this.isExpired = false;

    // 回呼函式
    this.onTick = null;       // (remaining, total, percent) => {}
    this.onWarning = null;    // (remaining) => {}
    this.onExpire = null;     // () => {}
  }

  setDuration(sec) {
    this.totalSeconds = Math.max(5, parseInt(sec, 10) || 30);
    this.reset();
  }

  start() {
    this.stop();
    this.remainingSeconds = this.totalSeconds;
    this.isRunning = true;
    this.isExpired = false;

    if (this.onTick) {
      this.onTick(this.remainingSeconds, this.totalSeconds, 100);
    }

    this.intervalId = setInterval(() => {
      this.remainingSeconds--;

      const percent = Math.max(0, (this.remainingSeconds / this.totalSeconds) * 100);

      if (this.onTick) {
        this.onTick(this.remainingSeconds, this.totalSeconds, percent);
      }

      // 最後 5 秒警告音效與提示
      if (this.remainingSeconds <= 5 && this.remainingSeconds > 0) {
        sound.playTick();
        if (this.onWarning) {
          this.onWarning(this.remainingSeconds);
        }
      }

      // 時間到
      if (this.remainingSeconds <= 0) {
        this.stop();
        this.isExpired = true;
        sound.playTimesUp();
        if (this.onExpire) {
          this.onExpire();
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
    this.remainingSeconds = this.totalSeconds;
    this.isExpired = false;
    if (this.onTick) {
      this.onTick(this.remainingSeconds, this.totalSeconds, 100);
    }
  }
}


// === 田字格畫布核心 ===
/**
 * 田字格 / 米字格 Canvas 手寫核心模組
 * 深度支援 iPad + Apple Pencil 壓感、Retina 像素對齊與零延遲筆跡
 */
class TianZiGeCanvas {
  /**
   * @param {HTMLCanvasElement} canvasElement 
   * @param {Object} options 
   */
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    this.options = Object.assign({
      gridType: 'tian', // 'tian' (田字格) 或 'mi' (米字格)
      gridColor: '#f43f5e',
      lineColor: '#fca5a5',
      inkColor: '#1e293b',
      baseStrokeWidth: 4.5,
      pressureSensitive: true,
      onStrokeEnd: null
    }, options);

    this.isDrawing = false;
    this.isLocked = false;
    this.strokes = []; // 儲存歷史筆劃以支援「復原 (Undo)」
    this.currentStroke = [];

    this.dpr = window.devicePixelRatio || 1;
    this.initCanvasSize();
    this.bindEvents();
    this.render();
  }

  initCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    // 以當前容器寬度（例如 150px、80px 或 200px）為基準
    const width = Math.round(rect.width || 150);
    const height = Math.round(rect.height || 150);

    this.dpr = window.devicePixelRatio || 1;

    // 高解析度螢幕 (Retina iPad) 縮放設定
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);

    // 明確鎖定 CSS 像素尺寸，防止百分比或浮點數佈局產生縮放位移
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cssWidth = width;
    this.cssHeight = height;
  }

  bindEvents() {
    const el = this.canvas;

    el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    el.addEventListener('pointermove', (e) => this.onPointerMove(e));
    el.addEventListener('pointerup', (e) => this.onPointerUp(e));
    el.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    el.addEventListener('pointerleave', (e) => {
      if (this.isDrawing) this.onPointerUp(e);
    });
  }

  /**
   * 精準計算觸控/筆尖相對於 Canvas 的內部邏輯座標
   * 自動校正螢幕縮放與外框邊界，徹底消除筆跡位移
   */
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
    
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    this.isDrawing = true;
    const pt = this.getPointerPos(e);
    this.currentStroke = [pt];
    this.drawDot(pt);
  }

  onPointerMove(e) {
    if (!this.isDrawing || this.isLocked) return;
    
    const pt = this.getPointerPos(e);
    const lastPt = this.currentStroke[this.currentStroke.length - 1];
    
    this.currentStroke.push(pt);

    // 零延遲即時繪製線段，筆跡永遠緊貼筆尖
    this.drawSegment(lastPt, pt);
  }

  onPointerUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (this.currentStroke.length > 0) {
      this.strokes.push([...this.currentStroke]);
      this.currentStroke = [];
    }

    if (this.options.onStrokeEnd) {
      this.options.onStrokeEnd();
    }
  }

  /** 繪製落筆起始圓點 */
  drawDot(pt) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.options.inkColor;
    ctx.beginPath();
    const radius = (this.options.baseStrokeWidth * (0.6 + pt.pressure * 0.8)) / 2;
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 即時連接相鄰兩點，支援 Apple Pencil 壓感線條寬度 */
  drawSegment(p1, p2) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.options.inkColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let lineWidth = this.options.baseStrokeWidth;
    if (this.options.pressureSensitive && p2.pointerType === 'pen') {
      lineWidth = this.options.baseStrokeWidth * (0.5 + p2.pressure * 1.0);
    } else {
      lineWidth = this.options.baseStrokeWidth * 0.9;
    }
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.restore();
  }

  /** 重繪整個畫布 (包含背景田字格與所有歷史筆劃) */
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

  /** 繪製清晰的田字格與米字格輔助線 */
  drawBackgroundGrid(ctx, w, h) {
    ctx.save();

    // 背景底色：溫潤米白紙張質感
    ctx.fillStyle = '#fffefc';
    ctx.fillRect(0, 0, w, h);

    const pad = 2; // 邊距
    const bw = w - pad * 2;
    const bh = h - pad * 2;

    // 外邊框 (紅色實線)
    ctx.strokeStyle = this.options.gridColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(pad, pad, bw, bh);

    // 輔助虛線 (淡紅色虛線)
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

    // 米字格：對角虛線
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

  /** 復原上一筆筆劃 (Undo) */
  undo() {
    if (this.isLocked || this.strokes.length === 0) return;
    this.strokes.pop();
    this.render();
  }

  /** 清除目前田字格 */
  clear() {
    if (this.isLocked) return;
    this.strokes = [];
    this.currentStroke = [];
    this.render();
  }

  /** 倒數時間到：鎖定畫布禁止作答 */
  setLocked(locked) {
    this.isLocked = !!locked;
    if (this.isLocked) {
      this.isDrawing = false;
      this.canvas.parentElement?.classList.add('locked');
    } else {
      this.canvas.parentElement?.classList.remove('locked');
    }
  }

  /** 匯出手寫成果為 Data URL (PNG) */
  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  /** 檢查畫布是否已有筆跡 */
  hasContent() {
    return this.strokes.length > 0;
  }
}


// === 題庫管理模組 ===
/**
 * 題庫管理模組 (LocalStorage 持久化儲存與匯入匯出)
 */

const STORAGE_KEY_BANKS = 'gifted_s_word_banks';
const STORAGE_KEY_ACTIVE_BANK = 'gifted_s_active_bank_id';

// 預設示範題庫 (國小經典常用生字詞語 20 題)
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
      console.error('Failed to load banks from localStorage:', e);
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
      console.error('Failed to save banks to localStorage:', e);
    }
  }

  getAllBanks() {
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

  /**
   * 將使用者輸入的多行文字或逗號分隔文字解析為乾淨的詞語陣列
   * @param {string} textRaw 
   * @returns {string[]}
   */
  static parseWordText(textRaw) {
    if (!textRaw || typeof textRaw !== 'string') return [];
    return textRaw
      .split(/[\n\r,，、;；\s]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  }

  /**
   * 新增題庫
   */
  createBank(name, wordsText) {
    const words = BankManager.parseWordText(wordsText);
    const newBank = {
      id: 'bank-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: name.trim() || '未命名題庫',
      words: words,
      createdAt: Date.now()
    };
    this.banks.unshift(newBank);
    this.activeBankId = newBank.id;
    this.saveToStorage();
    return newBank;
  }

  /**
   * 更新現有題庫
   */
  updateBank(id, name, wordsText) {
    const bank = this.banks.find(b => b.id === id);
    if (!bank) return false;

    bank.name = name.trim() || bank.name;
    bank.words = BankManager.parseWordText(wordsText);
    this.saveToStorage();
    return true;
  }

  /**
   * 刪除題庫
   */
  deleteBank(id) {
    if (this.banks.length <= 1) {
      alert('請至少保留一個題庫！');
      return false;
    }
    this.banks = this.banks.filter(b => b.id !== id);
    if (this.activeBankId === id) {
      this.activeBankId = this.banks[0].id;
    }
    this.saveToStorage();
    return true;
  }

  /**
   * 匯出所有題庫為 JSON 檔案
   */
  exportToJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.banks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `國語聽寫題庫_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * 從 JSON 字串匯入題庫
   */
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data) && data.length > 0 && data[0].words) {
        this.banks = data;
        this.activeBankId = this.banks[0].id;
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import JSON:', e);
      return false;
    }
  }
}

const bankManager = new BankManager();


// === 主控制器 ===
/**
 * 國語生字聽寫 App 主應用控制器
 */

// 全域設定 Key
const STORAGE_KEY_SETTINGS = 'gifted_s_settings';

class AppController {
  constructor() {
    this.settings = {
      countdownSeconds: 30,
      gridType: 'tian',        // 'tian' 或 'mi'
      gridSize: 'comfortable', // 'compact' (76px/2cm), 'comfortable' (150px), 'large' (200px)
      allowReplay: true,       // 倒數期間是否允許再次點擊播放重聽
      randomOrder: true,       // 是否隨機抽題
      speechRate: 0.85         // 語音語速
    };

    this.timer = new QuizTimer(this.settings.countdownSeconds);
    this.currentCanvases = [];
    this.quizQuestions = [];
    this.currentIndex = 0;
    this.quizResults = []; // 儲存作答成果截圖與比對資訊
    this.hasPlayedCurrentAudio = false;

    this.initDOM();
    this.initTimerCallbacks();
    this.loadSettings();
    this.bindEvents();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
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
    } catch (e) {}
    this.applySettingsToUI();
  }

  applySettingsToUI() {
    // 套用格線大小到 CSS 變數
    let sizePx = '150px';
    if (this.settings.gridSize === 'compact') sizePx = '80px';
    if (this.settings.gridSize === 'large') sizePx = '200px';
    document.documentElement.style.setProperty('--grid-size', sizePx);

    // 套用計時秒數
    this.timer.setDuration(this.settings.countdownSeconds);
    if (this.elTimerBadge) {
      this.elTimerBadge.textContent = `${this.settings.countdownSeconds}s`;
    }

    // 套用語速
    speech.setRate(this.settings.speechRate);

    // 同步更新設定面板上的控制項數值
    const inputTimer = document.getElementById('setting-timer');
    const selectGridSize = document.getElementById('setting-grid-size');
    const selectGridType = document.getElementById('setting-grid-type');
    const checkReplay = document.getElementById('setting-replay');
    const checkRandom = document.getElementById('setting-random');
    const selectRate = document.getElementById('setting-speech-rate');

    if (inputTimer && document.activeElement !== inputTimer) {
      inputTimer.value = this.settings.countdownSeconds;
    }
    if (selectGridSize) selectGridSize.value = this.settings.gridSize;
    if (selectGridType) selectGridType.value = this.settings.gridType;
    if (checkReplay) checkReplay.checked = this.settings.allowReplay;
    if (checkRandom) checkRandom.checked = this.settings.randomOrder;
    if (selectRate) selectRate.value = this.settings.speechRate;
  }

  initDOM() {
    // 導覽標籤與畫面
    this.navBtns = document.querySelectorAll('.nav-btn');
    this.views = {
      quiz: document.getElementById('view-quiz'),
      banks: document.getElementById('view-banks'),
      result: document.getElementById('view-result'),
      settings: document.getElementById('view-settings')
    };

    // 測驗元素
    this.elProgressCount = document.getElementById('quiz-progress-count');
    this.elBankBadgeName = document.getElementById('quiz-bank-name');
    this.elTimerBadge = document.getElementById('timer-badge');
    this.elTimerBar = document.getElementById('timer-bar-inner');
    this.elLockOverlay = document.getElementById('stage-lock-overlay');
    this.elGridContainer = document.getElementById('tian-grid-container');

    this.btnPlayAudio = document.getElementById('btn-play-audio');
    this.btnNextQuestion = document.getElementById('btn-next-question');
    this.btnClearCanvas = document.getElementById('btn-clear-canvas');
    this.btnUndoStroke = document.getElementById('btn-undo-stroke');

    // 題庫管理元素
    this.elBankListContainer = document.getElementById('bank-list-container');
    this.btnNewBank = document.getElementById('btn-new-bank');
    this.btnExportBanks = document.getElementById('btn-export-banks');
    this.fileImportInput = document.getElementById('file-import-input');
  }

  bindEvents() {
    // 導覽切換
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.dataset.view;
        this.switchView(targetView);
      });
    });

    // 播放音檔與倒數
    this.btnPlayAudio.addEventListener('click', () => this.handlePlayAudio());

    // 下一題
    this.btnNextQuestion.addEventListener('click', () => this.handleNextQuestion());

    // 清除畫布
    this.btnClearCanvas.addEventListener('click', () => {
      this.currentCanvases.forEach(c => c.clear());
    });

    // 復原上一筆
    this.btnUndoStroke.addEventListener('click', () => {
      // 復原最後一個有筆劃的畫布
      for (let i = this.currentCanvases.length - 1; i >= 0; i--) {
        if (this.currentCanvases[i].hasContent()) {
          this.currentCanvases[i].undo();
          break;
        }
      }
    });

    // 題庫管理按鈕
    this.btnNewBank.addEventListener('click', () => this.showBankEditorModal());
    this.btnExportBanks.addEventListener('click', () => bankManager.exportToJSON());
    this.fileImportInput.addEventListener('change', (e) => this.handleImportFile(e));

    // 設定表單事件綁定
    this.bindSettingsEvents();

    // 視窗大小改變或平板旋轉時自動更新畫布尺寸
    window.addEventListener('resize', () => {
      this.currentCanvases.forEach(c => {
        c.initCanvasSize();
        c.render();
      });
    });

    // 初始載入題庫清單並開始準備測驗
    this.renderBankList();
    this.startQuiz();
  }

  initTimerCallbacks() {
    this.timer.onTick = (remaining, total, percent) => {
      this.elTimerBadge.textContent = `${remaining}s`;
      this.elTimerBar.style.width = `${percent}%`;

      if (remaining <= 5) {
        this.elTimerBadge.classList.add('warning');
        this.elTimerBar.classList.add('warning');
      } else {
        this.elTimerBadge.classList.remove('warning');
        this.elTimerBar.classList.remove('warning');
      }
    };

    this.timer.onExpire = () => {
      this.elTimerBadge.classList.remove('warning');
      this.elTimerBadge.classList.add('locked');
      this.elLockOverlay.classList.add('visible');

      // 鎖定所有田字格畫布
      this.currentCanvases.forEach(c => c.setLocked(true));
      this.btnClearCanvas.disabled = true;
      this.btnUndoStroke.disabled = true;

      // 如果不允許時間到後重播，停用播放按鈕
      if (!this.settings.allowReplay) {
        this.btnPlayAudio.disabled = true;
      }
    };
  }

  switchView(viewName) {
    // 停止正在進行的計時與發音
    speech.stop();

    Object.keys(this.views).forEach(key => {
      if (this.views[key]) {
        this.views[key].classList.toggle('active', key === viewName);
      }
    });

    this.navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    if (viewName === 'banks') {
      this.renderBankList();
    }
    if (viewName === 'settings') {
      this.applySettingsToUI();
    }
  }

  /**
   * 開始新測驗 (抽取 20 題或全出)
   */
  startQuiz() {
    const bank = bankManager.getActiveBank();
    if (!bank || !bank.words || bank.words.length === 0) {
      alert('目前選擇的題庫沒有詞語，請先前往「題庫管理」新增詞語！');
      this.switchView('banks');
      return;
    }

    // 抽題邏輯：若超過 20 題，隨機或順序取 20 題；小於等於 20 題則全出
    let words = [...bank.words];
    if (this.settings.randomOrder) {
      // Fisher-Yates 洗牌演算法
      for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
      }
    }

    if (words.length > 20) {
      words = words.slice(0, 20);
    }

    this.quizQuestions = words;
    this.currentIndex = 0;
    this.quizResults = [];

    this.elBankBadgeName.textContent = bank.name;
    this.switchView('quiz');
    this.renderQuestion(this.currentIndex);
  }

  /**
   * 渲染第 N 題
   */
  renderQuestion(index) {
    this.currentIndex = index;
    const word = this.quizQuestions[index];
    const total = this.quizQuestions.length;

    // 更新進度顯示
    this.elProgressCount.textContent = `${index + 1} / ${total}`;
    this.btnNextQuestion.textContent = (index === total - 1) ? '完成測驗' : '下一題';

    // 重置狀態
    this.hasPlayedCurrentAudio = false;
    this.timer.setDuration(this.settings.countdownSeconds);
    this.timer.reset();
    if (this.elTimerBadge) {
      this.elTimerBadge.textContent = `${this.settings.countdownSeconds}s`;
      this.elTimerBadge.classList.remove('warning', 'locked');
    }
    if (this.elTimerBar) {
      this.elTimerBar.style.width = '100%';
      this.elTimerBar.classList.remove('warning');
    }
    this.elLockOverlay.classList.remove('visible');
    this.btnClearCanvas.disabled = false;
    this.btnUndoStroke.disabled = false;
    this.btnPlayAudio.disabled = false;
    this.btnPlayAudio.classList.remove('speaking');

    // 清空並動態建立田字格畫布 (依據該詞語的字數)
    this.elGridContainer.innerHTML = '';
    this.currentCanvases = [];

    const chars = word.split('');
    chars.forEach((char, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tian-cell-wrapper';

      const canvasBox = document.createElement('div');
      canvasBox.className = 'tian-canvas-box';

      const canvasEl = document.createElement('canvas');
      canvasEl.className = 'handwriting-canvas';

      canvasBox.appendChild(canvasEl);
      wrapper.appendChild(canvasBox);

      // 若為多字詞，標示第幾個字
      if (chars.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'cell-index-badge';
        badge.textContent = `第 ${idx + 1} 字`;
        wrapper.appendChild(badge);
      }

      this.elGridContainer.appendChild(wrapper);

      // 實例化田字格手寫板
      const tianCanvas = new TianZiGeCanvas(canvasEl, {
        gridType: this.settings.gridType,
        onStrokeEnd: () => {
          // 書寫中若計時器尚未啟動，提示可先點播放
        }
      });

      this.currentCanvases.push(tianCanvas);
    });

    // 延遲一點點自動觸發繪製調整以適配正確尺寸
    setTimeout(() => {
      this.currentCanvases.forEach(c => {
        c.initCanvasSize();
        c.render();
      });
    }, 50);
  }

  /**
   * 點擊播放發音 (同時啟動 30 秒倒數)
   */
  handlePlayAudio() {
    const word = this.quizQuestions[this.currentIndex];
    if (!word) return;

    // 若設定不允許倒數中重播且已經在計時中
    if (!this.settings.allowReplay && this.timer.isRunning) {
      return;
    }

    this.btnPlayAudio.classList.add('speaking');

    // 啟動朗讀
    speech.speak(word, 
      () => {
        // 發音開始
        this.btnPlayAudio.classList.add('speaking');
      },
      () => {
        // 發音結束
        this.btnPlayAudio.classList.remove('speaking');
      }
    );

    // 第一次點擊播放時啟動倒數計時器
    if (!this.hasPlayedCurrentAudio) {
      this.hasPlayedCurrentAudio = true;
      this.timer.start();
    }
  }

  /**
   * 下一題或完成測驗
   */
  handleNextQuestion() {
    const word = this.quizQuestions[this.currentIndex];
    
    // 擷取目前所有字的手寫截圖
    const charImages = this.currentCanvases.map(c => c.toDataURL());

    this.quizResults.push({
      questionIndex: this.currentIndex,
      standardWord: word,
      charImages: charImages,
      isCorrect: true // 預設為正確，供結算頁檢視時打勾/打叉
    });

    this.timer.stop();

    if (this.currentIndex < this.quizQuestions.length - 1) {
      this.renderQuestion(this.currentIndex + 1);
    } else {
      // 測驗結束，進入成果與對答案畫面
      this.showQuizResult();
    }
  }

  /**
   * 顯示測驗結算畫面 (標準國字 vs 手寫筆劃對照)
   */
  showQuizResult() {
    sound.playSuccess();
    this.switchView('result');

    const totalQuestions = this.quizResults.length;
    const elScoreNum = document.getElementById('result-score-num');
    const elScoreTotal = document.getElementById('result-score-total');
    const elReviewList = document.getElementById('review-list-container');

    elScoreTotal.textContent = `/ ${totalQuestions * 5} 分`; // 每題5分

    const updateScore = () => {
      const correctCount = this.quizResults.filter(r => r.isCorrect).length;
      elScoreNum.textContent = correctCount * 5;
    };

    updateScore();
    elReviewList.innerHTML = '';

    this.quizResults.forEach((item, qIdx) => {
      const card = document.createElement('div');
      card.className = `review-item-card ${item.isCorrect ? 'correct' : 'wrong'}`;

      // 標準字 (楷體大字)
      const wordBox = document.createElement('div');
      wordBox.className = 'review-standard-word font-kai';
      wordBox.textContent = item.standardWord;

      // 手寫畫布縮圖
      const previewBox = document.createElement('div');
      previewBox.className = 'review-handwriting-preview';

      item.charImages.forEach(imgUrl => {
        const img = document.createElement('img');
        img.className = 'review-thumb';
        img.src = imgUrl;
        img.alt = '手寫字跡';
        previewBox.appendChild(img);
      });

      // 打勾 / 打叉評分按鈕
      const btnGroup = document.createElement('div');
      btnGroup.className = 'check-btn-group';

      const btnPass = document.createElement('button');
      btnPass.className = `check-btn btn-pass ${item.isCorrect ? 'selected' : ''}`;
      btnPass.innerHTML = '✓';
      btnPass.title = '批改為正確';

      const btnFail = document.createElement('button');
      btnFail.className = `check-btn btn-fail ${!item.isCorrect ? 'selected' : ''}`;
      btnFail.innerHTML = '✗';
      btnFail.title = '批改為錯誤';

      btnPass.onclick = () => {
        item.isCorrect = true;
        card.className = 'review-item-card correct';
        btnPass.classList.add('selected');
        btnFail.classList.remove('selected');
        updateScore();
      };

      btnFail.onclick = () => {
        item.isCorrect = false;
        card.className = 'review-item-card wrong';
        btnFail.classList.add('selected');
        btnPass.classList.remove('selected');
        updateScore();
      };

      btnGroup.appendChild(btnPass);
      btnGroup.appendChild(btnFail);

      card.appendChild(wordBox);
      card.appendChild(previewBox);
      card.appendChild(btnGroup);

      elReviewList.appendChild(card);
    });

    // 重新測驗按鈕
    document.getElementById('btn-retest').onclick = () => {
      this.startQuiz();
    };
  }

  /**
   * 渲染題庫管理列表
   */
  renderBankList() {
    const banks = bankManager.getAllBanks();
    const activeBank = bankManager.getActiveBank();
    this.elBankListContainer.innerHTML = '';

    banks.forEach(bank => {
      const isSelected = activeBank && activeBank.id === bank.id;
      const card = document.createElement('div');
      card.className = `bank-card ${isSelected ? 'selected' : ''}`;

      const header = document.createElement('div');
      header.className = 'bank-card-header';

      const title = document.createElement('div');
      title.className = 'bank-name';
      title.textContent = bank.name;

      const badge = document.createElement('span');
      badge.className = 'bank-badge';
      badge.textContent = `${bank.words.length} 題`;

      header.appendChild(title);
      header.appendChild(badge);

      const preview = document.createElement('div');
      preview.className = 'bank-preview';
      preview.textContent = bank.words.slice(0, 10).join('、') + (bank.words.length > 10 ? '...' : '');

      const actions = document.createElement('div');
      actions.className = 'bank-actions';

      const btnSelect = document.createElement('button');
      btnSelect.className = 'tool-btn';
      btnSelect.textContent = isSelected ? '目前選擇' : '選擇此題庫';
      if (isSelected) btnSelect.style.borderColor = 'var(--primary)';
      btnSelect.onclick = (e) => {
        e.stopPropagation();
        bankManager.setActiveBank(bank.id);
        this.renderBankList();
        this.startQuiz();
      };

      const btnEdit = document.createElement('button');
      btnEdit.className = 'tool-btn';
      btnEdit.textContent = '編輯';
      btnEdit.onclick = (e) => {
        e.stopPropagation();
        this.showBankEditorModal(bank);
      };

      const btnDelete = document.createElement('button');
      btnDelete.className = 'tool-btn danger';
      btnDelete.textContent = '刪除';
      btnDelete.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除「${bank.name}」嗎？`)) {
          bankManager.deleteBank(bank.id);
          this.renderBankList();
        }
      };

      actions.appendChild(btnSelect);
      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);

      card.appendChild(header);
      card.appendChild(preview);
      card.appendChild(actions);

      card.onclick = () => {
        bankManager.setActiveBank(bank.id);
        this.renderBankList();
      };

      this.elBankListContainer.appendChild(card);
    });
  }

  /**
   * 彈出題庫編輯 Modal
   */
  showBankEditorModal(bankToEdit = null) {
    const modal = document.getElementById('bank-editor-modal');
    const inputName = document.getElementById('modal-bank-name');
    const textareaWords = document.getElementById('modal-bank-words');
    const btnSave = document.getElementById('btn-modal-save');
    const btnCancel = document.getElementById('btn-modal-cancel');

    if (bankToEdit) {
      inputName.value = bankToEdit.name;
      textareaWords.value = bankToEdit.words.join('\n');
    } else {
      inputName.value = '';
      textareaWords.value = '';
    }

    modal.style.display = 'flex';

    btnCancel.onclick = () => {
      modal.style.display = 'none';
    };

    btnSave.onclick = () => {
      const name = inputName.value.trim() || '未命名題庫';
      const words = textareaWords.value;

      if (bankToEdit) {
        bankManager.updateBank(bankToEdit.id, name, words);
      } else {
        bankManager.createBank(name, words);
      }

      modal.style.display = 'none';
      this.renderBankList();
    };
  }

  /**
   * 匯入 JSON 題庫檔案
   */
  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const success = bankManager.importFromJSON(e.target.result);
      if (success) {
        alert('題庫匯入成功！');
        this.renderBankList();
      } else {
        alert('匯入失敗，請確認檔案格式是否正確。');
      }
      this.fileImportInput.value = '';
    };
    reader.readAsText(file);
  }

  /**
   * 綁定設定面板相關互動 (點擊儲存按鈕保存所有設定)
   */
  bindSettingsEvents() {
    const inputTimer = document.getElementById('setting-timer');
    const selectGridSize = document.getElementById('setting-grid-size');
    const selectGridType = document.getElementById('setting-grid-type');
    const checkReplay = document.getElementById('setting-replay');
    const checkRandom = document.getElementById('setting-random');
    const selectRate = document.getElementById('setting-speech-rate');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const saveMsg = document.getElementById('save-settings-msg');

    // 初始載入設定值至表單
    if (inputTimer) inputTimer.value = this.settings.countdownSeconds;
    if (selectGridSize) selectGridSize.value = this.settings.gridSize;
    if (selectGridType) selectGridType.value = this.settings.gridType;
    if (checkReplay) checkReplay.checked = this.settings.allowReplay;
    if (checkRandom) checkRandom.checked = this.settings.randomOrder;
    if (selectRate) selectRate.value = this.settings.speechRate;

    // 執行儲存的統一函式
    const doSave = () => {
      // 1. 處理倒數時間 (允許輸入自訂數字，限制在 5 ~ 300 秒)
      if (inputTimer) {
        let sec = parseInt(inputTimer.value, 10);
        if (isNaN(sec) || sec < 5) sec = 5;
        if (sec > 300) sec = 300;
        inputTimer.value = sec;
        this.settings.countdownSeconds = sec;
      }

      // 2. 處理其他各項設定
      if (selectGridSize) this.settings.gridSize = selectGridSize.value;
      if (selectGridType) this.settings.gridType = selectGridType.value;
      if (checkReplay) this.settings.allowReplay = checkReplay.checked;
      if (checkRandom) this.settings.randomOrder = checkRandom.checked;
      if (selectRate) this.settings.speechRate = parseFloat(selectRate.value);

      // 3. 寫入 LocalStorage 並套用
      this.saveSettings();

      // 4. 即時更新現有畫布
      this.currentCanvases.forEach(c => {
        c.options.gridType = this.settings.gridType;
        c.initCanvasSize();
        c.render();
      });

      // 5. 提示使用者「設定已儲存」
      if (btnSaveSettings) {
        btnSaveSettings.innerHTML = '<span>✅ 設定已儲存！</span>';
        btnSaveSettings.style.background = 'linear-gradient(135deg, #059669, #10b981)';
      }
      if (saveMsg) {
        saveMsg.style.display = 'flex';
      }

      setTimeout(() => {
        if (btnSaveSettings) {
          btnSaveSettings.innerHTML = '<span>💾 儲存設定</span>';
          btnSaveSettings.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
        }
        if (saveMsg) {
          saveMsg.style.display = 'none';
        }
      }, 2000);
    };

    // 點擊「儲存設定」按鈕
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', doSave);
    }

    // 在倒數秒數輸入框按 Enter 亦可快速儲存
    if (inputTimer) {
      inputTimer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSave();
        }
      });

      // 輸入數字時即時同步至計時器與標籤，保證兩處秒數絕對一致
      inputTimer.addEventListener('input', () => {
        let sec = parseInt(inputTimer.value, 10);
        if (!isNaN(sec) && sec >= 5 && sec <= 300) {
          this.settings.countdownSeconds = sec;
          this.timer.setDuration(sec);
          if (this.elTimerBadge) {
            this.elTimerBadge.textContent = `${sec}s`;
          }
        }
      });

      inputTimer.addEventListener('change', () => {
        doSave();
      });
    }
  }
}

// 確保 DOM 載入時一定能啟動應用
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
  });
} else {
  window.app = new AppController();
}


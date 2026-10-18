// === 音效模組 ===
/**
 * Web Audio API 原生音效合成模組
 * 免載入外部音檔，100% 離線可用，低延遲且支援靜音控制
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.4);
    });
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.linearRampToValueAtTime(140, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playTick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  playTimeout() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [329.63, 261.63].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.2, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.45);
    });
  }

  playTap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0.2, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.6);
    });
  }
}

const sound = new SoundManager();


// === 題目生成引擎 ===
/**
 * 數學加減題目生成引擎
 * 支援 1~3 位數、加減法/混合、進位/退位約束、防負數出題與直式結構解析
 */

class MathEngine {
  /**
   * @param {Object} options 
   * @param {number} options.digitMode 1 (一位數), 2 (二位數), 3 (三位數), 'mixed_2_1', 'mixed_3_2', 'mixed_all'
   * @param {string} options.operation '+' | '-' | 'mixed'
   * @param {string} options.regroupMode 'all' (隨機) | 'no_regroup' (不進位/不退位) | 'must_regroup' (必進位/必退位)
   * @param {number} options.questionCount 總題數
   */
  constructor(options = {}) {
    this.digitMode = options.digitMode || 2;
    this.operation = options.operation || '+';
    this.regroupMode = options.regroupMode || 'all';
    this.questionCount = options.questionCount || 10;
  }

  /**
   * 根據位數模式取得隨機數範圍
   */
  getRange(mode) {
    switch (String(mode)) {
      case '1':
        return { min: 1, max: 9 };
      case '2':
        return { min: 10, max: 99 };
      case '3':
        return { min: 100, max: 999 };
      default:
        return { min: 10, max: 99 };
    }
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 檢查加法是否會產生進位
   */
  hasCarry(a, b) {
    let carry = 0;
    while (a > 0 || b > 0) {
      const d1 = a % 10;
      const d2 = b % 10;
      if (d1 + d2 + carry >= 10) {
        return true;
      }
      carry = Math.floor((d1 + d2 + carry) / 10);
      a = Math.floor(a / 10);
      b = Math.floor(b / 10);
    }
    return false;
  }

  /**
   * 檢查減法是否會產生借位 (退位)
   */
  hasBorrow(a, b) {
    while (a > 0 || b > 0) {
      const d1 = a % 10;
      const d2 = b % 10;
      if (d1 < d2) {
        return true;
      }
      a = Math.floor(a / 10);
      b = Math.floor(b / 10);
    }
    return false;
  }

  /**
   * 根據設定與當前運算子決定出題數字對
   * @param {string} op '+' | '-'
   */
  pickDigits(op = '+') {
    let min1, max1, min2, max2;

    if (this.digitMode === '1') {
      if (op === '-' && this.regroupMode === 'must_regroup') {
        // 20以內退位減法 (小一標準課綱退位減法): 被減數 11~18, 減數 2~9
        return { min1: 11, max1: 18, min2: 2, max2: 9 };
      }
      return { min1: 1, max1: 9, min2: 1, max2: 9 };
    } else if (this.digitMode === '2') {
      return { min1: 10, max1: 99, min2: 10, max2: 99 };
    } else if (this.digitMode === '3') {
      return { min1: 100, max1: 999, min2: 100, max2: 999 };
    } else if (this.digitMode === 'mixed_2_1') {
      // 二位數與一位數
      return { min1: 10, max1: 99, min2: 1, max2: 9 };
    } else if (this.digitMode === 'mixed_3_2') {
      // 三位數與二位數
      return { min1: 100, max1: 999, min2: 10, max2: 99 };
    } else {
      // mixed_all: 1~3 位數全部混合
      let d1 = this.getRandomInt(1, 3);
      // 若為減法且必退位，被減數至少需要 2 位數才可能退位借位
      if (op === '-' && this.regroupMode === 'must_regroup') {
        d1 = this.getRandomInt(2, 3);
      }
      const d2 = this.getRandomInt(1, d1); // 第二個數小於等於第一個數位數
      const r1 = this.getRange(d1);
      const r2 = this.getRange(d2);
      return { min1: r1.min, max1: r1.max, min2: r2.min, max2: r2.max };
    }
  }

  /**
   * 防禦性安全題目建構 (極端重試耗盡時調用，保證數學運算 100% 正確)
   */
  createFallbackQuestion(id) {
    let op = this.operation === 'mixed' ? '+' : this.operation;
    let num1, num2;
    if (op === '+') {
      if (this.regroupMode === 'no_regroup') {
        num1 = 23; num2 = 14;
      } else {
        num1 = 28; num2 = 15;
      }
    } else {
      if (this.regroupMode === 'no_regroup') {
        num1 = 35; num2 = 12;
      } else {
        num1 = 32; num2 = 15;
      }
    }
    const answer = op === '+' ? num1 + num2 : num1 - num2;
    const isRegroup = op === '+' ? this.hasCarry(num1, num2) : this.hasBorrow(num1, num2);
    return {
      id,
      num1,
      num2,
      op,
      answer,
      isRegroup,
      vertical: {
        top: String(num1),
        bottom: String(num2),
        op,
        maxDigits: Math.max(String(num1).length, String(num2).length, String(answer).length)
      }
    };
  }

  /**
   * 產生單一題目
   */
  generateSingle(id = 1) {
    let attempts = 0;

    while (attempts < 500) {
      attempts++;

      // 1. 決定運算子
      let op = this.operation;
      if (op === 'mixed') {
        op = Math.random() < 0.5 ? '+' : '-';
      }

      // 2. 根據運算子與模式決定數字範圍
      const { min1, max1, min2, max2 } = this.pickDigits(op);
      let num1 = this.getRandomInt(min1, max1);
      let num2 = this.getRandomInt(min2, max2);

      if (op === '-') {
        // 確保大數減小數 (避免負數)
        if (num1 < num2) {
          const temp = num1;
          num1 = num2;
          num2 = temp;
        }

        // 避免減數為0或兩數相同導致答案為0
        if (num1 === num2 || num2 === 0) {
          continue;
        }

        const isBorrow = this.hasBorrow(num1, num2);
        if (this.regroupMode === 'no_regroup' && isBorrow) {
          continue;
        }
        if (this.regroupMode === 'must_regroup' && !isBorrow) {
          continue;
        }

        const answer = num1 - num2;
        return {
          id,
          num1,
          num2,
          op,
          answer,
          isRegroup: isBorrow,
          vertical: {
            top: String(num1),
            bottom: String(num2),
            op: op,
            maxDigits: Math.max(String(num1).length, String(num2).length, String(answer).length)
          }
        };
      } else {
        const isCarry = this.hasCarry(num1, num2);
        if (this.regroupMode === 'no_regroup' && isCarry) {
          continue;
        }
        if (this.regroupMode === 'must_regroup' && !isCarry) {
          continue;
        }

        const answer = num1 + num2;
        return {
          id,
          num1,
          num2,
          op,
          answer,
          isRegroup: isCarry,
          vertical: {
            top: String(num1),
            bottom: String(num2),
            op: op,
            maxDigits: Math.max(String(num1).length, String(num2).length, String(answer).length)
          }
        };
      }
    }

    return this.createFallbackQuestion(id);
  }

  /**
   * 產生完整測驗題目清單
   */
  generateQuiz() {
    const list = [];
    const used = new Set();

    for (let i = 1; i <= this.questionCount; i++) {
      let q;
      let tries = 0;
      do {
        tries++;
        q = this.generateSingle(i);
      } while (used.has(`${q.num1}${q.op}${q.num2}`) && tries < 50);

      used.add(`${q.num1}${q.op}${q.num2}`);
      list.push(q);
    }
    return list;
  }
}


// === 高精度計時器 ===
/**
 * 測驗計時器模組
 * 支援倒數計時 (含最後 3 秒提示) 與不限時正向計時，精度基於時間戳避免跳幀
 */

class QuizTimer {
  constructor() {
    this.timerId = null;
    this.totalSeconds = 0;
    this.remainingSeconds = 0;
    this.elapsedSeconds = 0;
    this.isCountdown = true;
    this.isRunning = false;
    this.startTime = null;

    this.onTick = null;
    this.onWarning = null;
    this.onTimeout = null;
    this.warned = new Set();
  }

  /**
   * 啟動計時
   * @param {number} seconds 總秒數 (0 表示不限時)
   * @param {Function} onTick (state) => {}
   * @param {Function} onWarning (rem) => {}
   * @param {Function} onTimeout () => {}
   */
  start(seconds, onTick, onWarning, onTimeout) {
    this.stop();

    this.totalSeconds = Math.max(0, parseInt(seconds, 10) || 0);
    this.isCountdown = this.totalSeconds > 0;
    this.remainingSeconds = this.totalSeconds;
    this.elapsedSeconds = 0;
    this.onTick = onTick;
    this.onWarning = onWarning;
    this.onTimeout = onTimeout;
    this.warned.clear();
    this.isRunning = true;
    this.startTime = Date.now();

    // 觸發初始狀態
    this.emitTick();

    this.timerId = setInterval(() => {
      if (!this.isRunning) return;

      const now = Date.now();
      const diffSec = Math.floor((now - this.startTime) / 1000);

      if (this.isCountdown) {
        this.remainingSeconds = Math.max(0, this.totalSeconds - diffSec);
        this.elapsedSeconds = this.totalSeconds - this.remainingSeconds;

        // 最後 3 秒觸發警告
        if (this.remainingSeconds <= 3 && this.remainingSeconds > 0) {
          if (!this.warned.has(this.remainingSeconds)) {
            this.warned.add(this.remainingSeconds);
            if (this.onWarning) this.onWarning(this.remainingSeconds);
          }
        }

        this.emitTick();

        if (this.remainingSeconds <= 0) {
          this.stop();
          if (this.onTimeout) this.onTimeout();
        }
      } else {
        // 不限時正向計時
        this.elapsedSeconds = diffSec;
        this.emitTick();
      }
    }, 200);
  }

  emitTick() {
    if (!this.onTick) return;

    const percent = this.isCountdown
      ? (this.remainingSeconds / this.totalSeconds) * 100
      : 100;

    this.onTick({
      isCountdown: this.isCountdown,
      total: this.totalSeconds,
      remaining: this.remainingSeconds,
      elapsed: this.elapsedSeconds,
      percent: Math.max(0, Math.min(100, percent)),
      formatted: this.formatTime(this.isCountdown ? this.remainingSeconds : this.elapsedSeconds)
    });
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  getRemaining() {
    return this.remainingSeconds;
  }

  getElapsed() {
    return this.elapsedSeconds;
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }
}


// === 直式手寫草稿板 ===
/**
 * 直式手寫草稿板 (Scratchpad Canvas)
 * 深度適配 iPad + Apple Pencil：
 * 1. 240Hz 高頻採樣 (getCoalescedEvents)、落筆即時成點與即時連線 (與國語聽寫同級靈敏度)
 * 2. 嚴格數學對齊：個位、十位、百位、千位與垂直導引虛線、欄位標籤 100% 精準對齊
 * 3. 支援進退位輔助標註區、蓋印直式題型、橡皮擦、復原 (Undo) 與筆跡快照
 */

class ScratchpadCanvas {
  /**
   * @param {HTMLCanvasElement} canvasElement 
   * @param {Object} options 
   */
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.options = Object.assign({
      gridType: 'vertical', // 'vertical' (直式對齊線), 'grid' (方格紙), 'blank' (空白)
      penColor: '#1e293b',
      penWidth: 4,
      baseStrokeWidth: 4,
      pressureSensitive: true,
      penOnly: false, // 是否僅允許 Apple Pencil (防手掌誤觸)
      onStrokeEnd: null
    }, options);

    this.isDrawing = false;
    this.isEraser = false;
    this.isLocked = false;
    this.currentPointerId = null;
    this.strokes = []; // 儲存筆劃歷史支援 Undo: [ { color, width, isEraser, points: [{x,y,pressure,pointerType}] } ]
    this.currentStroke = [];
    this.stampedProblem = null; // 儲存蓋印的直式題目

    this.dpr = window.devicePixelRatio || 1;
    this.initCanvasSize();
    this.bindEvents();
    this.render();

    // 監聽螢幕旋轉與視窗大小變化
    window.addEventListener('resize', () => this.handleResize());
  }

  initCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.round(rect.width || 600);
    const height = Math.round(rect.height || 500);

    this.dpr = window.devicePixelRatio || 1;

    // 高解析度螢幕 (Retina iPad) 縮放設定
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);

    // 明確鎖定 CSS 像素尺寸
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cssWidth = width;
    this.cssHeight = height;
  }

  handleResize() {
    this.initCanvasSize();
    this.render();
  }

  bindEvents() {
    const el = this.canvas;
    // 使用 { passive: false } 確保 e.preventDefault() 100% 生效，防止 iOS 瀏覽器手勢攔截與中斷筆劃
    el.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
    el.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
    el.addEventListener('pointerup', (e) => this.onPointerUp(e), { passive: false });
    el.addEventListener('pointercancel', (e) => this.onPointerCancel(e), { passive: false });
  }

  /**
   * 精準計算觸控/筆尖相對於 Canvas 的內部邏輯座標
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

    // 若開啟「Apple Pencil 專用模式」，忽略所有手指或手掌誤觸 (touch)
    if (this.options.penOnly && e.pointerType === 'touch') {
      return;
    }

    e.preventDefault();

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    this.isDrawing = true;
    this.currentPointerId = e.pointerId;

    const pt = this.getPointerPos(e);
    this.currentStroke = [pt];
    this.drawDot(pt); // 與聽寫 App 同樣：落筆瞬間立即畫點，絕不丟失起始筆觸！
  }

  onPointerMove(e) {
    if (!this.isDrawing || this.isLocked) return;
    if (this.currentPointerId !== null && e.pointerId !== this.currentPointerId) return;

    e.preventDefault();

    // 關鍵升級：支援 iPad Pro/Air 240Hz 高頻採樣 (getCoalescedEvents)
    const events = (e.getCoalescedEvents && e.getCoalescedEvents().length > 0)
      ? e.getCoalescedEvents()
      : [e];

    for (const ev of events) {
      const pt = this.getPointerPos(ev);
      const lastPt = this.currentStroke[this.currentStroke.length - 1];

      if (lastPt) {
        const dx = pt.x - lastPt.x;
        const dy = pt.y - lastPt.y;
        // 靈敏度門檻：位移 >= 0.5 像素 (0.25) 即時繪製，極度靈敏跟筆
        if (dx * dx + dy * dy >= 0.25) {
          this.currentStroke.push(pt);
          this.drawSegment(lastPt, pt);
        }
      } else {
        this.currentStroke.push(pt);
      }
    }
  }

  onPointerUp(e) {
    if (!this.isDrawing) return;
    if (this.currentPointerId !== null && e.pointerId !== this.currentPointerId) return;

    this.isDrawing = false;
    this.currentPointerId = null;

    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (this.currentStroke.length > 0) {
      this.strokes.push({
        color: this.options.penColor,
        width: this.options.penWidth,
        isEraser: this.isEraser,
        points: [...this.currentStroke]
      });
      this.currentStroke = [];
      // 注意：不在 pointerup 時 clear 重繪，保持 60/120fps 超流暢運筆體驗！
    }

    if (this.options.onStrokeEnd) {
      this.options.onStrokeEnd();
    }
  }

  onPointerCancel(e) {
    this.onPointerUp(e);
  }

  /**
   * 繪製落筆起始圓點
   */
  drawDot(pt) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.isEraser ? '#ffffff' : this.options.penColor;
    ctx.beginPath();

    const baseW = this.options.penWidth || 4;
    const radius = this.isEraser
      ? (baseW * 4.0) / 2
      : (baseW * (0.6 + pt.pressure * 0.8)) / 2;

    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 即時連接相鄰兩點，支援 Apple Pencil 壓感線條寬度
   */
  drawSegment(p1, p2) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.isEraser ? '#ffffff' : this.options.penColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const baseW = this.options.penWidth || 4;
    let lineWidth = baseW;
    if (this.isEraser) {
      lineWidth = baseW * 4.0;
    } else if (this.options.pressureSensitive && p2.pointerType === 'pen') {
      lineWidth = baseW * (0.5 + p2.pressure * 1.0);
    } else {
      lineWidth = baseW * 0.9;
    }
    ctx.lineWidth = lineWidth;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 計算直式位數欄位的幾何座標 (千、百、十、個位 + 符號欄)
   */
  getColumnMetrics() {
    const w = this.cssWidth;
    const h = this.cssHeight;
    const columnCount = 5; // [0: 符號, 1: 千位, 2: 百位, 3: 十位, 4: 個位]

    // 依畫布寬度自適應最舒適的欄寬 (每欄 68px ~ 88px)
    const colWidth = Math.min(88, Math.max(68, Math.floor((w - 50) / (columnCount + 1))));
    const totalWidth = colWidth * columnCount;
    // 水平置中偏右 (符合書寫習慣)
    const startX = Math.round((w - totalWidth) / 2);

    return {
      w,
      h,
      columnCount,
      colWidth,
      totalWidth,
      startX,
      // 取得第 i 欄的中心 X 座標
      colCenterX: (colIdx) => startX + colWidth * colIdx + colWidth / 2,
      // 取得第 i 條隔線的 X 座標
      lineX: (lineIdx) => startX + colWidth * lineIdx
    };
  }

  /**
   * 繪製背景格線 (直式位數對齊模式 / 方格紙 / 空白紙)
   */
  renderGrid() {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    // 清空重繪純白底色
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (this.options.gridType === 'vertical') {
      const m = this.getColumnMetrics();

      ctx.save();

      // 1. 垂直輔助虛線 (貫穿整個計算與答案區)
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);

      for (let i = 0; i <= m.columnCount; i++) {
        const x = m.lineX(i);
        ctx.beginPath();
        ctx.moveTo(x, 15);
        ctx.lineTo(x, h - 20);
        ctx.stroke();
      }

      ctx.setLineDash([]); // 恢復實線

      // 2. 欄位標籤：千、百、十、個
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const labels = [
        { col: 1, text: '千', color: '#64748b' },
        { col: 2, text: '百', color: '#059669' },
        { col: 3, text: '十', color: '#059669' },
        { col: 4, text: '個', color: '#059669' }
      ];

      for (const item of labels) {
        ctx.fillStyle = item.color;
        ctx.fillText(item.text, m.colCenterX(item.col), 34);
      }

      // 3. 標題橫向分隔線
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.startX, 54);
      ctx.lineTo(m.startX + m.totalWidth, 54);
      ctx.stroke();

      // 4. 進退位小數字標記區輔助虛線 (小朋友在上方寫進位小 1 或借位劃線)
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(m.startX, 92);
      ctx.lineTo(m.startX + m.totalWidth, 92);
      ctx.stroke();

      ctx.font = '11px -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('進退位', m.colCenterX(0), 73);

      ctx.restore();

    } else if (this.options.gridType === 'grid') {
      // 數學方格紙模式
      const gridSize = 30;
      ctx.save();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * 繪製蓋印直式題目 (百位、十位、個位 100% 精準對齊)
   */
  renderStampedProblem() {
    if (!this.stampedProblem) return;
    const { num1, num2, op } = this.stampedProblem;
    const ctx = this.ctx;
    const m = this.getColumnMetrics();

    ctx.save();
    ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const yRow1 = 142;     // 被加數 / 被減數 Y 座標
    const yRow2 = 206;     // 加數 / 減數 Y 座標
    const yCalcLine = 244; // 橫算底線 Y 座標

    // 嚴格對位：從個位 (Col 4) 往左排列至十位 (Col 3)、百位 (Col 2)、千位 (Col 1)
    const drawDigits = (num, y) => {
      const s = String(num);
      const len = s.length;
      for (let i = 0; i < len; i++) {
        const digitChar = s[len - 1 - i]; // i=0 為個位，i=1 為十位，i=2 為百位，i=3 為千位
        const targetCol = 4 - i;
        if (targetCol >= 0) {
          ctx.fillText(digitChar, m.colCenterX(targetCol), y);
        }
      }
    };

    // 1. 繪製第一列數字
    drawDigits(num1, yRow1);

    // 2. 繪製第二列數字
    drawDigits(num2, yRow2);

    // 3. 繪製運算符號 (放在 Col 0 符號專用欄)
    ctx.fillStyle = '#2563eb';
    ctx.fillText(op, m.colCenterX(0), yRow2);

    // 4. 繪製直式計算橫底線
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(m.startX + 6, yCalcLine);
    ctx.lineTo(m.startX + m.totalWidth - 6, yCalcLine);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 重繪整個畫布 (背景格線 + 蓋印題目 + 所有歷史筆劃)
   */
  render() {
    this.renderGrid();
    this.renderStampedProblem();

    // 完整重繪歷史筆劃 (用於 Undo、清除或旋轉視窗時)
    for (const stroke of this.strokes) {
      const points = stroke.points;
      if (!points || points.length === 0) continue;

      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;
      ctx.fillStyle = stroke.isEraser ? '#ffffff' : stroke.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (points.length === 1) {
        ctx.beginPath();
        const baseW = stroke.width || 4;
        const radius = stroke.isEraser
          ? (baseW * 4.0) / 2
          : (baseW * (0.6 + points[0].pressure * 0.8)) / 2;
        ctx.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const baseW = stroke.width || 4;
        let lineWidth = baseW;
        if (stroke.isEraser) {
          lineWidth = baseW * 4.0;
        } else if (this.options.pressureSensitive && p2.pointerType === 'pen') {
          lineWidth = baseW * (0.5 + p2.pressure * 1.0);
        } else {
          lineWidth = baseW * 0.9;
        }
        ctx.lineWidth = lineWidth;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /**
   * 蓋印當前直式題目到畫布上
   */
  stampProblem(question) {
    this.stampedProblem = question;
    this.render();
  }

  /**
   * 清除蓋印題目
   */
  clearStampedProblem() {
    this.stampedProblem = null;
    this.render();
  }

  /**
   * 復原上一步 (Undo)
   */
  undo() {
    if (this.isLocked || this.strokes.length === 0) return false;
    this.strokes.pop();
    this.render();
    return true;
  }

  /**
   * 清空所有手寫筆劃
   */
  clear() {
    if (this.isLocked) return;
    this.strokes = [];
    this.render();
  }

  /**
   * 取得手寫筆劃資料副本 (用於題目切換保存)
   */
  getStrokes() {
    return JSON.parse(JSON.stringify(this.strokes));
  }

  /**
   * 載入指定筆劃資料與蓋印題目
   */
  loadStrokes(strokes = [], stampedProblem = null) {
    this.strokes = strokes ? JSON.parse(JSON.stringify(strokes)) : [];
    this.stampedProblem = stampedProblem || null;
    this.render();
  }

  /**
   * 設定畫筆顏色
   */
  setPenColor(color) {
    this.options.penColor = color;
    this.isEraser = false;
  }

  /**
   * 設定筆寬
   */
  setPenWidth(width) {
    this.options.penWidth = width;
  }

  /**
   * 切換橡皮擦
   */
  setEraser(enable) {
    this.isEraser = enable;
  }

  /**
   * 切換格線類型 ('vertical' | 'grid' | 'blank')
   */
  setGridType(type) {
    this.options.gridType = type;
    this.render();
  }

  /**
   * 切換防手掌誤觸 (僅 Apple Pencil)
   */
  setPenOnly(enable) {
    this.options.penOnly = enable;
  }

  /**
   * 取得手寫筆跡快照 (DataURL PNG)
   */
  getSnapshot() {
    if (this.strokes.length === 0 && !this.stampedProblem) {
      return null;
    }
    return this.canvas.toDataURL('image/png');
  }

  /**
   * 是否有手寫筆跡
   */
  hasStrokes() {
    return this.strokes.length > 0;
  }
}


// === 應用程式主控制器 ===

class MathApp {
  constructor() {
    this.timer = new QuizTimer();
    this.canvas = null;

    // 測驗設定狀態
    this.config = {
      mode: 'exam', // 'exam' (總時長測驗模式) | 'speed' (單題速算挑戰)
      questionCount: 10,
      totalTime: 180, // 總時長秒數 (180 = 3分鐘, 0 = 不限時)
      timerSeconds: 20, // 單題速算秒數
      digitMode: '2',
      operation: '+',
      regroupMode: 'all',
      penOnly: false
    };

    // 測驗進行中狀態
    this.questions = [];
    this.currentIndex = 0;
    this.currentInput = '';
    this.records = []; // { question, userAnswer, isCorrect, timeSpent, snapshot }
    this.quizStartTime = 0;
    this.questionStartTime = 0;
    this.isLocked = false;

    this.checkUrlParams();
    this.initDOM();
    this.bindEvents();
    this.initCanvas();
    this.updateModeUI();
    this.renderHistoryPreview();
  }

  checkUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode');
      if (m === 'speed' || m === 'exam') {
        this.config.mode = m;
      }
    } catch (e) {
      // ignore
    }
  }

  initDOM() {
    // 畫面區塊
    this.screenSetup = document.getElementById('screen-setup');
    this.screenQuiz = document.getElementById('screen-quiz');
    this.screenReview = document.getElementById('screen-review');
    this.screenResult = document.getElementById('screen-result');

    // 設定區元件
    this.settingGroupTotalTime = document.getElementById('setting-group-total-time');
    this.settingGroupSpeedTime = document.getElementById('setting-group-speed-time');

    // 作答區
    this.progressText = document.getElementById('progress-text');
    this.progressFill = document.getElementById('progress-fill');
    this.timerDisplay = document.getElementById('timer-display');
    this.timerBox = document.getElementById('timer-box');
    this.problemFormula = document.getElementById('problem-formula');
    this.answerDisplay = document.getElementById('answer-display');

    // 題號快捷列與題目導航 (總時長測驗模式)
    this.examNavBar = document.getElementById('exam-nav-bar');
    this.examPillStrip = document.getElementById('exam-pill-strip');
    this.btnQuizPrev = document.getElementById('btn-quiz-prev');
    this.btnQuizNext = document.getElementById('btn-quiz-next');
    this.btnQuizReview = document.getElementById('btn-quiz-review');

    // 總時長交卷前總覽核對畫面元件
    this.reviewTimerDisplay = document.getElementById('review-timer-display');
    this.reviewAnsweredStat = document.getElementById('review-answered-stat');
    this.reviewUnansweredAlert = document.getElementById('review-unanswered-alert');
    this.reviewUnansweredCount = document.getElementById('review-unanswered-count');
    this.reviewItemsContainer = document.getElementById('review-items-container');
    this.btnReviewBack = document.getElementById('btn-review-back');
    this.btnReviewConfirmSubmit = document.getElementById('btn-review-confirm-submit');

    // 結算區
    this.finalScore = document.getElementById('final-score');
    this.statCorrect = document.getElementById('stat-correct');
    this.statTime = document.getElementById('stat-time');
    this.statAvgTime = document.getElementById('stat-avg-time');
    this.reviewList = document.getElementById('review-list');
    this.btnResultHistory = document.getElementById('btn-result-history');

    // 歷史紀錄相關元件
    this.btnHistory = document.getElementById('btn-history');
    this.btnViewAllHistory = document.getElementById('btn-view-all-history');
    this.historyBadgeCount = document.getElementById('history-badge-count');
    this.setupHistoryPreview = document.getElementById('setup-history-preview');

    this.modalHistoryOverlay = document.getElementById('modal-history-overlay');
    this.modalHistoryClose = document.getElementById('modal-history-close');
    this.modalHistoryCloseBtn = document.getElementById('modal-history-close-btn');
    this.modalHistoryList = document.getElementById('modal-history-list');
    this.btnClearHistory = document.getElementById('btn-clear-history');

    this.histTotalCount = document.getElementById('hist-total-count');
    this.histAvgScore = document.getElementById('hist-avg-score');
    this.histAvgSpeed = document.getElementById('hist-avg-speed');
    this.histBestScore = document.getElementById('hist-best-score');

    // 手寫筆跡 Modal
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalImg = document.getElementById('modal-img');
    this.modalTitle = document.getElementById('modal-title');
    this.modalClose = document.getElementById('modal-close');

    // 頂部按鈕
    this.btnPenOnly = document.getElementById('btn-pen-only');
    this.btnMute = document.getElementById('btn-mute');
  }

  initCanvas() {
    const canvasEl = document.getElementById('scratchpad-canvas');
    if (canvasEl) {
      this.canvas = new ScratchpadCanvas(canvasEl, {
        gridType: 'vertical',
        penColor: '#1e293b',
        penWidth: 4,
        penOnly: this.config.penOnly
      });
    }
  }

  updateModeUI() {
    // 依當前 mode 同步 Tab 外觀與時間設定顯示
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === this.config.mode);
    });

    if (this.settingGroupTotalTime) {
      this.settingGroupTotalTime.style.display = (this.config.mode === 'exam') ? 'block' : 'none';
    }
    if (this.settingGroupSpeedTime) {
      this.settingGroupSpeedTime.style.display = (this.config.mode === 'speed') ? 'block' : 'none';
    }
  }

  bindEvents() {
    // === 測驗模式切換 ===
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        sound.playTap();
        this.config.mode = tab.dataset.mode;
        this.updateModeUI();
      });
    });

    // === 設定選項按鈕切換 ===
    document.querySelectorAll('.opt-pill-group').forEach(group => {
      const field = group.dataset.field;
      group.querySelectorAll('.opt-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          sound.playTap();
          group.querySelectorAll('.opt-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const val = btn.dataset.val;
          const inputWrap = group.parentElement.querySelector('.custom-input-wrap');

          if (val === 'custom') {
            if (inputWrap) inputWrap.style.display = 'flex';
          } else {
            if (inputWrap) inputWrap.style.display = 'none';

            if (field === 'questionCount') this.config.questionCount = parseInt(val, 10);
            if (field === 'totalTime') this.config.totalTime = parseInt(val, 10);
            if (field === 'timerSeconds') this.config.timerSeconds = parseInt(val, 10);
            if (field === 'digitMode') this.config.digitMode = val;
            if (field === 'operation') this.config.operation = val;
            if (field === 'regroupMode') this.config.regroupMode = val;
          }
        });
      });
    });

    // 自訂題數輸入框連動
    const customCountInput = document.getElementById('custom-count-input');
    if (customCountInput) {
      customCountInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (val > 0) this.config.questionCount = Math.min(100, val);
      });
    }

    // 自訂總時長輸入連動
    const customTotalTimeInput = document.getElementById('custom-total-time-input');
    const customTotalTimeUnit = document.getElementById('custom-total-time-unit');
    const customTotalTimeHint = document.getElementById('custom-total-time-hint');

    const updateTotalTimeFromCustom = () => {
      const val = parseInt(customTotalTimeInput.value, 10) || 1;
      const unit = customTotalTimeUnit ? customTotalTimeUnit.value : 'min';
      const sec = unit === 'min' ? val * 60 : val;
      this.config.totalTime = sec;
      if (customTotalTimeHint) {
        customTotalTimeHint.textContent = `(即 ${sec} 秒)`;
      }
    };
    if (customTotalTimeInput) {
      customTotalTimeInput.addEventListener('input', updateTotalTimeFromCustom);
    }
    if (customTotalTimeUnit) {
      customTotalTimeUnit.addEventListener('change', updateTotalTimeFromCustom);
    }

    // 自訂單題秒數輸入框連動
    const customTimeInput = document.getElementById('custom-time-input');
    if (customTimeInput) {
      customTimeInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (val >= 0) this.config.timerSeconds = Math.min(300, val);
      });
    }

    // 開始測驗按鈕
    document.getElementById('btn-start').addEventListener('click', () => {
      sound.playTap();
      this.startQuiz();
    });

    // 重新開始測驗
    document.getElementById('btn-restart').addEventListener('click', () => {
      sound.playTap();
      this.startQuiz();
    });

    // 返回設定
    document.getElementById('btn-settings').addEventListener('click', () => {
      sound.playTap();
      this.showScreen('setup');
    });

    // 靜音切換
    if (this.btnMute) {
      this.btnMute.addEventListener('click', () => {
        sound.muted = !sound.muted;
        this.btnMute.classList.toggle('active', sound.muted);
        this.btnMute.innerHTML = sound.muted ? '🔇 靜音' : '🔊 音效';
      });
    }

    // Apple Pencil 防手掌誤觸切換
    if (this.btnPenOnly) {
      this.btnPenOnly.addEventListener('click', () => {
        sound.playTap();
        this.config.penOnly = !this.config.penOnly;
        this.btnPenOnly.classList.toggle('active', this.config.penOnly);
        if (this.canvas) {
          this.canvas.setPenOnly(this.config.penOnly);
        }
      });
    }

    // === 總時長測驗模式導航列按鈕 ===
    if (this.btnQuizPrev) {
      this.btnQuizPrev.addEventListener('click', () => {
        sound.playTap();
        this.prevQuestion();
      });
    }
    if (this.btnQuizNext) {
      this.btnQuizNext.addEventListener('click', () => {
        sound.playTap();
        this.nextQuestion();
      });
    }
    if (this.btnQuizReview) {
      this.btnQuizReview.addEventListener('click', () => {
        sound.playTap();
        this.enterExamReview();
      });
    }

    // === 交卷前總覽畫面按鈕 ===
    if (this.btnReviewBack) {
      this.btnReviewBack.addEventListener('click', () => {
        sound.playTap();
        this.showScreen('quiz');
        this.loadQuestion(this.currentIndex);
      });
    }
    if (this.btnReviewConfirmSubmit) {
      this.btnReviewConfirmSubmit.addEventListener('click', () => {
        sound.playTap();
        const unanswered = this.questions.filter(q => q.userAnswer === '').length;
        if (unanswered > 0) {
          if (confirm(`尚有 ${unanswered} 題未填寫答案，確定要交卷嗎？`)) {
            this.confirmSubmitExam();
          }
        } else {
          this.confirmSubmitExam();
        }
      });
    }

    // === 虛擬數字小鍵盤按鈕 ===
    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isLocked) return;
        const key = btn.dataset.key;
        sound.playTap();
        this.handleKeyInput(key);
      });
    });

    // 實體鍵盤支援
    window.addEventListener('keydown', (e) => {
      if (this.screenQuiz && this.screenQuiz.classList.contains('active')) {
        if (e.key >= '0' && e.key <= '9') {
          this.handleKeyInput(e.key);
        } else if (e.key === 'Backspace') {
          this.handleKeyInput('backspace');
        } else if (e.key === 'Enter') {
          this.handleKeyInput('enter');
        } else if (e.key === 'Escape') {
          this.handleKeyInput('clear');
        } else if (e.key === 'ArrowLeft') {
          if (this.config.mode === 'exam') this.prevQuestion();
        } else if (e.key === 'ArrowRight') {
          if (this.config.mode === 'exam') this.nextQuestion();
        }
      }
    });

    // === 直式草稿板工具按鈕 ===
    document.querySelectorAll('[data-grid]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playTap();
        document.querySelectorAll('[data-grid]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.canvas) this.canvas.setGridType(btn.dataset.grid);
      });
    });

    // 筆刷顏色選擇
    document.querySelectorAll('.color-dot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playTap();
        document.querySelectorAll('.color-dot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('btn-eraser').classList.remove('active');
        if (this.canvas) this.canvas.setPenColor(btn.dataset.color);
      });
    });

    // 橡皮擦
    const btnEraser = document.getElementById('btn-eraser');
    if (btnEraser) {
      btnEraser.addEventListener('click', () => {
        sound.playTap();
        const active = btnEraser.classList.toggle('active');
        if (this.canvas) this.canvas.setEraser(active);
      });
    }

    // 復原 Undo
    const btnUndo = document.getElementById('btn-undo');
    if (btnUndo) {
      btnUndo.addEventListener('click', () => {
        sound.playTap();
        if (this.canvas) this.canvas.undo();
      });
    }

    // 清空 Clear
    const btnClearCanvas = document.getElementById('btn-clear-canvas');
    if (btnClearCanvas) {
      btnClearCanvas.addEventListener('click', () => {
        sound.playTap();
        if (this.canvas) this.canvas.clear();
      });
    }

    // 蓋印直式題目到草稿紙
    const btnStamp = document.getElementById('btn-stamp');
    if (btnStamp) {
      btnStamp.addEventListener('click', () => {
        sound.playTap();
        const currQ = this.questions[this.currentIndex];
        if (currQ && this.canvas) {
          this.canvas.stampProblem(currQ);
        }
      });
    }

    // Modal 關閉
    if (this.modalClose) {
      this.modalClose.addEventListener('click', () => {
        this.modalOverlay.classList.remove('active');
      });
    }
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) {
          this.modalOverlay.classList.remove('active');
        }
      });
    }

    // === 歷史紀錄 Modal 事件 ===
    if (this.btnHistory) {
      this.btnHistory.addEventListener('click', () => this.openHistoryModal());
    }
    if (this.btnViewAllHistory) {
      this.btnViewAllHistory.addEventListener('click', () => this.openHistoryModal());
    }
    if (this.btnResultHistory) {
      this.btnResultHistory.addEventListener('click', () => this.openHistoryModal());
    }
    if (this.modalHistoryClose) {
      this.modalHistoryClose.addEventListener('click', () => this.closeHistoryModal());
    }
    if (this.modalHistoryCloseBtn) {
      this.modalHistoryCloseBtn.addEventListener('click', () => this.closeHistoryModal());
    }
    if (this.modalHistoryOverlay) {
      this.modalHistoryOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalHistoryOverlay) {
          this.closeHistoryModal();
        }
      });
    }
    if (this.btnClearHistory) {
      this.btnClearHistory.addEventListener('click', () => this.clearAllHistory());
    }
  }

  showScreen(name) {
    this.screenSetup.classList.remove('active');
    this.screenQuiz.classList.remove('active');
    if (this.screenReview) this.screenReview.classList.remove('active');
    this.screenResult.classList.remove('active');

    if (name === 'setup') this.screenSetup.classList.add('active');
    if (name === 'quiz') {
      this.screenQuiz.classList.add('active');
      setTimeout(() => {
        if (this.canvas) this.canvas.handleResize();
      }, 50);
    }
    if (name === 'review') {
      if (this.screenReview) this.screenReview.classList.add('active');
    }
    if (name === 'result') this.screenResult.classList.add('active');
  }

  startQuiz() {
    const engine = new MathEngine(this.config);
    const rawQuestions = engine.generateQuiz();

    this.questions = rawQuestions.map((q, idx) => ({
      index: idx,
      num1: q.num1,
      num2: q.num2,
      op: q.op,
      answer: q.answer,
      userAnswer: '',
      strokes: [],
      snapshot: null
    }));

    this.currentIndex = 0;
    this.records = [];
    this.currentInput = '';
    this.isLocked = false;
    this.quizStartTime = Date.now();

    // 依模式更新導航列顯隱
    if (this.examNavBar) {
      this.examNavBar.style.display = (this.config.mode === 'exam') ? 'flex' : 'none';
    }

    if (this.config.mode === 'exam') {
      this.renderExamPillStrip();
      this.startTotalTimer();
    }

    this.showScreen('quiz');
    this.loadQuestion(0);
  }

  startTotalTimer() {
    this.timerBox.classList.remove('warning');
    const totalSec = this.config.totalTime;

    this.timer.start(
      totalSec,
      (state) => {
        const timeStr = state.isCountdown ? state.formatted : state.formatted;
        this.timerDisplay.textContent = timeStr;
        if (this.reviewTimerDisplay) {
          this.reviewTimerDisplay.textContent = timeStr;
        }
      },
      (rem) => {
        this.timerBox.classList.add('warning');
        sound.playTick();
      },
      () => {
        this.handleExamTimeout();
      }
    );
  }

  handleExamTimeout() {
    sound.playTimeout();
    this.saveCurrentQuestionState();
    alert('⏱️ 測驗總時間已到！即將進入作答總覽核對。');
    this.enterExamReview();
  }

  renderExamPillStrip() {
    if (!this.examPillStrip) return;
    this.examPillStrip.innerHTML = '';
    this.questions.forEach((q, idx) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'exam-pill';
      pill.textContent = idx + 1;
      pill.dataset.idx = idx;
      if (idx === this.currentIndex) pill.classList.add('active');
      if (q.userAnswer !== '') pill.classList.add('has-answer');

      pill.addEventListener('click', () => {
        sound.playTap();
        this.saveCurrentQuestionState();
        this.loadQuestion(idx);
      });
      this.examPillStrip.appendChild(pill);
    });
  }

  updateExamPillStrip() {
    if (!this.examPillStrip) return;
    const pills = this.examPillStrip.querySelectorAll('.exam-pill');
    pills.forEach((pill, idx) => {
      const q = this.questions[idx];
      if (q) {
        pill.classList.toggle('active', idx === this.currentIndex);
        pill.classList.toggle('has-answer', q.userAnswer !== '');
      }
    });
  }

  saveCurrentQuestionState() {
    if (this.questions.length === 0 || this.currentIndex < 0 || this.currentIndex >= this.questions.length) return;
    const q = this.questions[this.currentIndex];
    q.userAnswer = this.currentInput;
    if (this.canvas) {
      q.strokes = this.canvas.getStrokes();
      q.snapshot = this.canvas.getSnapshot();
    }
    this.updateExamPillStrip();
  }

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.saveCurrentQuestionState();
      this.loadQuestion(this.currentIndex - 1);
    }
  }

  nextQuestion() {
    this.saveCurrentQuestionState();
    if (this.currentIndex < this.questions.length - 1) {
      this.loadQuestion(this.currentIndex + 1);
    } else {
      this.enterExamReview();
    }
  }

  loadQuestion(index) {
    if (index >= this.questions.length) {
      if (this.config.mode === 'exam') {
        this.enterExamReview();
      } else {
        this.finishQuiz();
      }
      return;
    }

    this.currentIndex = index;
    const q = this.questions[index];
    this.currentInput = (q.userAnswer !== undefined) ? String(q.userAnswer) : '';
    this.isLocked = false;
    this.updateAnswerDisplay();

    this.problemFormula.textContent = `${q.num1} ${q.op} ${q.num2} = ?`;
    this.progressText.textContent = `第 ${index + 1} / ${this.questions.length} 題`;
    this.progressFill.style.width = `${((index + 1) / this.questions.length) * 100}%`;

    // 載入該題手寫筆劃與題目蓋印
    if (this.canvas) {
      this.canvas.loadStrokes(q.strokes, q);
    }

    if (this.config.mode === 'exam') {
      this.updateExamPillStrip();
      if (this.btnQuizPrev) this.btnQuizPrev.disabled = (index === 0);
      if (this.btnQuizNext) {
        this.btnQuizNext.textContent = (index === this.questions.length - 1) ? '檢查交卷 📋' : '下一題 ▶';
      }
    } else {
      // speed 模式：每題獨立計時
      this.questionStartTime = Date.now();
      this.timerBox.classList.remove('warning');

      this.timer.start(
        this.config.timerSeconds,
        (state) => {
          this.timerDisplay.textContent = state.isCountdown ? `${state.remaining}s` : state.formatted;
        },
        (rem) => {
          this.timerBox.classList.add('warning');
          sound.playTick();
        },
        () => {
          this.handleTimeout();
        }
      );
    }
  }

  handleKeyInput(key) {
    if (key >= '0' && key <= '9') {
      if (this.currentInput.length < 6) {
        this.currentInput += key;
        this.updateAnswerDisplay();
      }
    } else if (key === 'backspace') {
      this.currentInput = this.currentInput.slice(0, -1);
      this.updateAnswerDisplay();
    } else if (key === 'clear') {
      this.currentInput = '';
      this.updateAnswerDisplay();
    } else if (key === 'enter') {
      if (this.config.mode === 'exam') {
        // 總時長測驗模式：輸入完按確定直接跳下一題，不評估對錯
        sound.playTap();
        this.saveCurrentQuestionState();
        if (this.currentIndex < this.questions.length - 1) {
          this.loadQuestion(this.currentIndex + 1);
        } else {
          this.enterExamReview();
        }
      } else {
        // 單題速算模式：每題評估對錯
        this.submitAnswer();
      }
    }
  }

  updateAnswerDisplay() {
    this.answerDisplay.textContent = this.currentInput || '?';
    this.answerDisplay.classList.toggle('focused', !!this.currentInput);
  }

  // === 總時長測驗模式：交卷前作答總覽核對 ===
  enterExamReview() {
    this.saveCurrentQuestionState();
    this.showScreen('review');

    const total = this.questions.length;
    const answeredCount = this.questions.filter(q => q.userAnswer !== '').length;
    const unansweredCount = total - answeredCount;

    if (this.reviewAnsweredStat) {
      this.reviewAnsweredStat.textContent = `${answeredCount} / ${total} 題`;
    }

    if (this.reviewUnansweredAlert) {
      if (unansweredCount > 0) {
        this.reviewUnansweredAlert.style.display = 'block';
        if (this.reviewUnansweredCount) this.reviewUnansweredCount.textContent = unansweredCount;
      } else {
        this.reviewUnansweredAlert.style.display = 'none';
      }
    }

    if (this.reviewItemsContainer) {
      this.reviewItemsContainer.innerHTML = '';
      this.questions.forEach((q, idx) => {
        const card = document.createElement('div');
        const isAnswered = q.userAnswer !== '';
        card.className = `review-item-card ${isAnswered ? 'is-answered' : 'is-unanswered'}`;

        card.innerHTML = `
          <div class="review-card-top">
            <span class="review-card-index">第 ${idx + 1} 題</span>
            <span class="review-card-edit-btn">修改 ✏️</span>
          </div>
          <div class="review-card-formula">${q.num1} ${q.op} ${q.num2} =</div>
          <div class="review-card-ans-val ${isAnswered ? 'filled' : 'empty'}">
            ${isAnswered ? q.userAnswer : '未填寫 ⚠️'}
          </div>
        `;

        card.addEventListener('click', () => {
          sound.playTap();
          this.showScreen('quiz');
          this.loadQuestion(idx);
        });

        this.reviewItemsContainer.appendChild(card);
      });
    }
  }

  // === 總時長測驗模式：確定交卷並一次批改全部 ===
  confirmSubmitExam() {
    this.timer.stop();

    const totalTimeSec = Math.max(1, Math.round((Date.now() - this.quizStartTime) / 1000));
    this.records = [];

    this.questions.forEach((q) => {
      const userAns = q.userAnswer !== '' ? parseInt(q.userAnswer, 10) : '未填';
      const isCorrect = userAns !== '未填' && userAns === q.answer;

      this.records.push({
        question: q,
        userAnswer: userAns,
        isCorrect: isCorrect,
        timeSpent: Math.round(totalTimeSec / this.questions.length),
        isTimeout: false,
        snapshot: q.snapshot || null
      });
    });

    this.renderResultScreen(totalTimeSec);
  }

  // === 單題速算模式：每題作答後即刻批改 ===
  submitAnswer() {
    if (this.isLocked || !this.currentInput) return;
    this.isLocked = true;
    this.timer.stop();

    const q = this.questions[this.currentIndex];
    const userAns = parseInt(this.currentInput, 10);
    const isCorrect = userAns === q.answer;
    const timeSpent = Math.round((Date.now() - this.questionStartTime) / 1000);
    const snapshot = this.canvas ? this.canvas.getSnapshot() : null;

    this.records.push({
      question: q,
      userAnswer: userAns,
      isCorrect: isCorrect,
      timeSpent: timeSpent,
      isTimeout: false,
      snapshot: snapshot
    });

    if (isCorrect) {
      sound.playCorrect();
      this.answerDisplay.classList.add('correct-anim');
      setTimeout(() => {
        this.answerDisplay.classList.remove('correct-anim');
        this.loadQuestion(this.currentIndex + 1);
      }, 550);
    } else {
      sound.playWrong();
      this.answerDisplay.classList.add('wrong-anim');
      setTimeout(() => {
        this.answerDisplay.classList.remove('wrong-anim');
        this.loadQuestion(this.currentIndex + 1);
      }, 700);
    }
  }

  handleTimeout() {
    if (this.isLocked) return;
    this.isLocked = true;
    sound.playTimeout();

    const q = this.questions[this.currentIndex];
    const snapshot = this.canvas ? this.canvas.getSnapshot() : null;

    this.records.push({
      question: q,
      userAnswer: this.currentInput ? parseInt(this.currentInput, 10) : '未填',
      isCorrect: false,
      timeSpent: this.config.timerSeconds,
      isTimeout: true,
      snapshot: snapshot
    });

    this.answerDisplay.classList.add('wrong-anim');
    setTimeout(() => {
      this.answerDisplay.classList.remove('wrong-anim');
      this.loadQuestion(this.currentIndex + 1);
    }, 700);
  }

  finishQuiz() {
    this.timer.stop();
    const totalTimeSec = this.records.reduce((acc, r) => acc + r.timeSpent, 0);
    this.renderResultScreen(totalTimeSec);
  }

  // === 結算畫面渲染 (兩種模式通用) ===
  renderResultScreen(totalTimeSec) {
    this.showScreen('result');

    const total = this.records.length;
    const correctCount = this.records.filter(r => r.isCorrect).length;
    const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const avgTimeSec = total > 0 ? (totalTimeSec / total).toFixed(1) : 0;

    this.finalScore.textContent = `${scorePct} 分`;
    this.statCorrect.textContent = `${correctCount} / ${total}`;
    this.statTime.textContent = `${totalTimeSec} 秒`;
    this.statAvgTime.textContent = `${avgTimeSec} 秒`;

    if (scorePct === 100) {
      sound.playFanfare();
    } else if (scorePct >= 80) {
      sound.playCorrect();
    }

    const modeLabel = this.config.mode === 'exam'
      ? `總時長(${this.config.totalTime > 0 ? Math.round(this.config.totalTime / 60) + '分' : '不限時'})`
      : `速算(${this.config.timerSeconds > 0 ? this.config.timerSeconds + '秒' : '不限時'})`;

    const historyItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      dateStr: this.formatDate(new Date()),
      score: scorePct,
      correctCount: correctCount,
      totalCount: total,
      totalTimeSec: totalTimeSec,
      avgTimeSec: parseFloat(avgTimeSec),
      digitMode: this.config.digitMode,
      digitModeLabel: this.getDigitModeLabel(this.config.digitMode),
      operation: this.config.operation,
      operationLabel: this.getOperationLabel(this.config.operation),
      regroupMode: this.config.regroupMode,
      regroupModeLabel: this.getRegroupLabel(this.config.regroupMode),
      modeSummary: `${modeLabel} · ${this.getDigitModeLabel(this.config.digitMode)} · ${this.getOperationLabel(this.config.operation)}`
    };
    this.addHistoryEntry(historyItem);
    this.renderHistoryPreview();

    // 渲染作答明細與手寫計算回顧
    this.reviewList.innerHTML = '';
    this.records.forEach((rec, idx) => {
      const q = rec.question;
      const item = document.createElement('div');
      item.className = `review-item ${rec.isCorrect ? 'is-correct' : 'is-wrong'}`;

      const formulaText = `${idx + 1}. ${q.num1} ${q.op} ${q.num2} = ${q.answer}`;
      let userAnsText = `你的答案: ${rec.userAnswer}`;
      if (rec.isTimeout) userAnsText += ' (時間到)';

      const leftDiv = document.createElement('div');
      leftDiv.innerHTML = `
        <div class="review-formula">${formulaText}</div>
        <div class="review-user-ans" style="color: ${rec.isCorrect ? '#15803d' : '#b91c1c'}; font-size: 13px; margin-top: 3px;">
          ${userAnsText}
        </div>
      `;

      const rightDiv = document.createElement('div');
      rightDiv.style.display = 'flex';
      rightDiv.style.alignItems = 'center';
      rightDiv.style.gap = '8px';

      const badge = document.createElement('span');
      badge.className = `badge-tag ${rec.isCorrect ? 'badge-correct' : 'badge-wrong'}`;
      badge.textContent = rec.isCorrect ? '答對 ✓' : '答錯 ✗';
      rightDiv.appendChild(badge);

      if (rec.snapshot) {
        const btnSnap = document.createElement('button');
        btnSnap.className = 'btn-view-snapshot';
        btnSnap.textContent = '手寫草稿 📝';
        btnSnap.addEventListener('click', () => {
          this.modalTitle.textContent = `第 ${idx + 1} 題手寫直式草稿 (${q.num1} ${q.op} ${q.num2})`;
          this.modalImg.src = rec.snapshot;
          this.modalOverlay.classList.add('active');
        });
        rightDiv.appendChild(btnSnap);
      }

      item.appendChild(leftDiv);
      item.appendChild(rightDiv);
      this.reviewList.appendChild(item);
    });
  }

  // =========================================
  // 歷史紀錄核心資料管理與渲染模組
  // =========================================

  getHistory() {
    try {
      const saved = localStorage.getItem('math_quiz_history_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load history:', e);
      return [];
    }
  }

  saveHistory(list) {
    try {
      localStorage.setItem('math_quiz_history_v1', JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  addHistoryEntry(entry) {
    const list = this.getHistory();
    list.unshift(entry);
    if (list.length > 100) list.length = 100; // 最多保存 100 筆
    this.saveHistory(list);
  }

  clearAllHistory() {
    if (confirm('確定要清除所有測驗歷史紀錄嗎？清除後無法復原。')) {
      sound.playTap();
      localStorage.removeItem('math_quiz_history_v1');
      this.renderHistoryPreview();
      this.renderHistoryModal();
    }
  }

  deleteHistoryEntry(targetId) {
    if (confirm('確定要刪除這筆測驗紀錄嗎？')) {
      sound.playTap();
      const list = this.getHistory();
      const updated = list.filter(r => String(r.id || r.timestamp) !== String(targetId));
      this.saveHistory(updated);
      this.renderHistoryPreview();
      this.renderHistoryModal();
    }
  }

  getDigitModeLabel(mode) {
    const map = {
      '1': '一位數',
      '2': '二位數',
      '3': '三位數',
      'mixed_2_1': '二位±一位',
      'mixed_3_2': '三位±二位',
      'mixed_all': '全隨機'
    };
    return map[mode] || mode;
  }

  getOperationLabel(op) {
    const map = {
      '+': '加法 (+)',
      '-': '減法 (-)',
      'mixed': '加減混合 (±)'
    };
    return map[op] || op;
  }

  getRegroupLabel(mode) {
    const map = {
      'all': '隨機進退',
      'no_regroup': '不進退位',
      'must_regroup': '必進退位'
    };
    return map[mode] || mode;
  }

  formatDate(d) {
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${m}/${day} ${h}:${min}`;
  }

  renderHistoryItem(item) {
    const el = document.createElement('div');
    el.className = 'history-item';

    let scoreClass = 'hist-score-mid';
    if (item.score === 100) scoreClass = 'hist-score-perfect';
    else if (item.score >= 80) scoreClass = 'hist-score-high';
    else if (item.score < 60) scoreClass = 'hist-score-low';

    el.innerHTML = `
      <div class="history-item-left">
        <div class="history-meta-row">
          <span class="history-date">📅 ${item.dateStr}</span>
          <span class="history-tag">${item.modeSummary || item.digitModeLabel || '數學運算'}</span>
        </div>
        <div class="history-detail-text">
          答對 <strong>${item.correctCount} / ${item.totalCount}</strong> 題（耗時 ${item.totalTimeSec} 秒）
        </div>
      </div>
      <div class="history-item-right">
        <div class="hist-score-badge ${scoreClass}">${item.score} 分</div>
        <div class="hist-speed-badge">⚡ ${item.avgTimeSec} 秒/題</div>
      </div>
      <button class="btn-delete-single-history" type="button" title="刪除此筆紀錄" aria-label="刪除此筆紀錄">🗑️</button>
    `;

    const btnDelete = el.querySelector('.btn-delete-single-history');
    if (btnDelete) {
      btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteHistoryEntry(item.id || item.timestamp);
      });
    }

    return el;
  }

  renderHistoryPreview() {
    if (!this.setupHistoryPreview) return;
    const history = this.getHistory();
    if (this.historyBadgeCount) {
      this.historyBadgeCount.textContent = `${history.length} 次練習`;
    }

    this.setupHistoryPreview.innerHTML = '';
    if (history.length === 0) {
      this.setupHistoryPreview.innerHTML = `
        <div class="history-empty-box">
          尚無測驗紀錄。完成測驗後，您的分數與平均作答秒數將自動記錄在此！
        </div>
      `;
      return;
    }

    const previewItems = history.slice(0, 3);
    previewItems.forEach(item => {
      this.setupHistoryPreview.appendChild(this.renderHistoryItem(item));
    });
  }

  renderHistoryModal() {
    const history = this.getHistory();
    const total = history.length;

    if (total === 0) {
      if (this.histTotalCount) this.histTotalCount.textContent = '0';
      if (this.histAvgScore) this.histAvgScore.textContent = '0 分';
      if (this.histAvgSpeed) this.histAvgSpeed.textContent = '0 秒';
      if (this.histBestScore) this.histBestScore.textContent = '0 分';
      if (this.modalHistoryList) {
        this.modalHistoryList.innerHTML = `
          <div class="history-empty-box" style="padding: 30px;">
            目前尚無任何練習歷史紀錄。請開始一次測驗！
          </div>
        `;
      }
      return;
    }

    const totalScore = history.reduce((acc, r) => acc + r.score, 0);
    const avgScore = Math.round(totalScore / total);
    const totalSpeed = history.reduce((acc, r) => acc + (parseFloat(r.avgTimeSec) || 0), 0);
    const avgSpeed = (totalSpeed / total).toFixed(1);
    const bestScore = Math.max(...history.map(r => r.score));

    if (this.histTotalCount) this.histTotalCount.textContent = String(total);
    if (this.histAvgScore) this.histAvgScore.textContent = `${avgScore} 分`;
    if (this.histAvgSpeed) this.histAvgSpeed.textContent = `${avgSpeed} 秒`;
    if (this.histBestScore) this.histBestScore.textContent = `${bestScore} 分`;

    if (this.modalHistoryList) {
      this.modalHistoryList.innerHTML = '';
      history.forEach(item => {
        this.modalHistoryList.appendChild(this.renderHistoryItem(item));
      });
    }
  }

  openHistoryModal() {
    sound.playTap();
    this.renderHistoryModal();
    if (this.modalHistoryOverlay) {
      this.modalHistoryOverlay.classList.add('active');
    }
  }

  closeHistoryModal() {
    sound.playTap();
    if (this.modalHistoryOverlay) {
      this.modalHistoryOverlay.classList.remove('active');
    }
  }
}

// 註冊 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// 啟動應用程式
window.addEventListener('DOMContentLoaded', () => {
  new MathApp();
});


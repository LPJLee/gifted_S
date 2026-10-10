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
   * 根據設定決定出題數字對
   */
  pickDigits() {
    let min1, max1, min2, max2;

    if (this.digitMode === '1') {
      ({ min: min1, max: max1 } = this.getRange('1'));
      ({ min: min2, max: max2 } = this.getRange('1'));
    } else if (this.digitMode === '2') {
      ({ min: min1, max: max1 } = this.getRange('2'));
      ({ min: min2, max: max2 } = this.getRange('2'));
    } else if (this.digitMode === '3') {
      ({ min: min1, max: max1 } = this.getRange('3'));
      ({ min: min2, max: max2 } = this.getRange('3'));
    } else if (this.digitMode === 'mixed_2_1') {
      // 二位數與一位數
      ({ min: min1, max: max1 } = this.getRange('2'));
      ({ min: min2, max: max2 } = this.getRange('1'));
    } else if (this.digitMode === 'mixed_3_2') {
      // 三位數與二位數
      ({ min: min1, max: max1 } = this.getRange('3'));
      ({ min: min2, max: max2 } = this.getRange('2'));
    } else {
      // mixed_all: 1~3 位數全部混合
      const d1 = this.getRandomInt(1, 3);
      const d2 = this.getRandomInt(1, d1); // 第二個數通常小於等於第一個數
      ({ min: min1, max: max1 } = this.getRange(d1));
      ({ min: min2, max: max2 } = this.getRange(d2));
    }

    return { min1, max1, min2, max2 };
  }

  /**
   * 產生單一題目
   */
  generateSingle(id = 1) {
    let op = this.operation;
    if (op === 'mixed') {
      op = Math.random() < 0.5 ? '+' : '-';
    }

    const { min1, max1, min2, max2 } = this.pickDigits();
    let num1, num2, answer;
    let attempts = 0;

    while (attempts < 200) {
      attempts++;
      num1 = this.getRandomInt(min1, max1);
      num2 = this.getRandomInt(min2, max2);

      if (op === '-') {
        // 確保不出現負數 (大數減小數)
        if (num1 < num2) {
          const temp = num1;
          num1 = num2;
          num2 = temp;
        }
        // 避免減數為0或兩數相同導致答案為0過於平淡 (可偶爾出現但不過多)
        if (num1 === num2 && Math.random() > 0.1) continue;

        answer = num1 - num2;

        if (this.regroupMode === 'no_regroup' && this.hasBorrow(num1, num2)) {
          continue;
        }
        if (this.regroupMode === 'must_regroup' && !this.hasBorrow(num1, num2)) {
          continue;
        }
      } else {
        answer = num1 + num2;

        if (this.regroupMode === 'no_regroup' && this.hasCarry(num1, num2)) {
          continue;
        }
        if (this.regroupMode === 'must_regroup' && !this.hasCarry(num1, num2)) {
          continue;
        }
      }

      break;
    }

    return {
      id,
      num1,
      num2,
      op,
      answer,
      isRegroup: op === '+' ? this.hasCarry(num1, num2) : this.hasBorrow(num1, num2),
      // 結構化直式呈現資訊
      vertical: {
        top: String(num1),
        bottom: String(num2),
        op: op,
        maxDigits: Math.max(String(num1).length, String(num2).length, String(answer).length)
      }
    };
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
      questionCount: 10,
      timerSeconds: 20,
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
    this.questionStartTime = 0;
    this.isLocked = false;

    this.initDOM();
    this.bindEvents();
    this.initCanvas();
  }

  initDOM() {
    // 畫面
    this.screenSetup = document.getElementById('screen-setup');
    this.screenQuiz = document.getElementById('screen-quiz');
    this.screenResult = document.getElementById('screen-result');

    // 作答區
    this.progressText = document.getElementById('progress-text');
    this.progressFill = document.getElementById('progress-fill');
    this.timerDisplay = document.getElementById('timer-display');
    this.timerBox = document.getElementById('timer-box');
    this.problemFormula = document.getElementById('problem-formula');
    this.answerDisplay = document.getElementById('answer-display');

    // 結算區
    this.finalScore = document.getElementById('final-score');
    this.statCorrect = document.getElementById('stat-correct');
    this.statTime = document.getElementById('stat-time');
    this.statAvgTime = document.getElementById('stat-avg-time');
    this.reviewList = document.getElementById('review-list');

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

  bindEvents() {
    // === 設定選項按鈕切換 ===
    document.querySelectorAll('.opt-pill-group').forEach(group => {
      const field = group.dataset.field;
      group.querySelectorAll('.opt-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          sound.playTap();
          group.querySelectorAll('.opt-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const val = btn.dataset.val;
          if (val === 'custom') {
            const inputWrap = group.parentElement.querySelector('.custom-input-wrap');
            if (inputWrap) inputWrap.style.display = 'flex';
          } else {
            const inputWrap = group.parentElement.querySelector('.custom-input-wrap');
            if (inputWrap) inputWrap.style.display = 'none';

            if (field === 'questionCount') this.config.questionCount = parseInt(val, 10);
            if (field === 'timerSeconds') this.config.timerSeconds = parseInt(val, 10);
            if (field === 'digitMode') this.config.digitMode = val;
            if (field === 'operation') this.config.operation = val;
            if (field === 'regroupMode') this.config.regroupMode = val;
          }
        });
      });
    });

    // 自訂輸入框連動
    const customCountInput = document.getElementById('custom-count-input');
    if (customCountInput) {
      customCountInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (val > 0) this.config.questionCount = Math.min(100, val);
      });
    }

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
      if (this.screenQuiz.classList.contains('active')) {
        if (e.key >= '0' && e.key <= '9') {
          this.handleKeyInput(e.key);
        } else if (e.key === 'Backspace') {
          this.handleKeyInput('backspace');
        } else if (e.key === 'Enter') {
          this.handleKeyInput('enter');
        } else if (e.key === 'Escape') {
          this.handleKeyInput('clear');
        }
      }
    });

    // === 直式草稿板工具按鈕 ===
    // 格線模式切換
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
  }

  showScreen(name) {
    this.screenSetup.classList.remove('active');
    this.screenQuiz.classList.remove('active');
    this.screenResult.classList.remove('active');

    if (name === 'setup') this.screenSetup.classList.add('active');
    if (name === 'quiz') {
      this.screenQuiz.classList.add('active');
      setTimeout(() => {
        if (this.canvas) this.canvas.handleResize();
      }, 50);
    }
    if (name === 'result') this.screenResult.classList.add('active');
  }

  startQuiz() {
    const engine = new MathEngine(this.config);
    this.questions = engine.generateQuiz();
    this.currentIndex = 0;
    this.records = [];
    this.currentInput = '';
    this.isLocked = false;

    this.showScreen('quiz');
    this.loadQuestion(0);
  }

  loadQuestion(index) {
    if (index >= this.questions.length) {
      this.finishQuiz();
      return;
    }

    this.currentIndex = index;
    this.currentInput = '';
    this.isLocked = false;
    this.updateAnswerDisplay();

    const q = this.questions[index];
    this.problemFormula.textContent = `${q.num1} ${q.op} ${q.num2} = ?`;
    this.progressText.textContent = `第 ${index + 1} / ${this.questions.length} 題`;
    this.progressFill.style.width = `${((index + 1) / this.questions.length) * 100}%`;

    // 清空手寫板，或預設蓋印直式題目輔助計算
    if (this.canvas) {
      this.canvas.clear();
      this.canvas.clearStampedProblem();
      this.canvas.stampProblem(q);
    }

    // 啟動計時器
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
      this.submitAnswer();
    }
  }

  updateAnswerDisplay() {
    this.answerDisplay.textContent = this.currentInput || '?';
    this.answerDisplay.classList.toggle('focused', !!this.currentInput);
  }

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
    this.showScreen('result');

    const total = this.records.length;
    const correctCount = this.records.filter(r => r.isCorrect).length;
    const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const totalTimeSec = this.records.reduce((acc, r) => acc + r.timeSpent, 0);
    const avgTimeSec = total > 0 ? (totalTimeSec / total).toFixed(1) : 0;

    this.finalScore.textContent = `${scorePct} 分`;
    this.statCorrect.textContent = `${correctCount} / ${total}`;
    this.statTime.textContent = `${totalTimeSec} 秒`;
    this.statAvgTime.textContent = `${avgTimeSec} 秒`;

    if (scorePct === 100) {
      sound.playFanfare();
    }

    // 渲染作答明細與錯題筆跡回顧
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


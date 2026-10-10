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
 * 深度適配 iPad + Apple Pencil：高頻採樣、防手掌誤觸、直式位數對齊輔助線、蓋印直式題型與筆跡快照
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
      penOnly: false, // 是否僅允許 Apple Pencil (防手掌誤觸)
      onStrokeEnd: null
    }, options);

    this.isDrawing = false;
    this.isEraser = false;
    this.currentPointerId = null;
    this.strokes = []; // 儲存筆劃歷史支援 Undo: [ { color, width, isEraser, points: [{x,y,pressure}] } ]
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

    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);

    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cssWidth = width;
    this.cssHeight = height;
  }

  handleResize() {
    const prevWidth = this.cssWidth;
    const prevHeight = this.cssHeight;
    this.initCanvasSize();
    this.render();
  }

  bindEvents() {
    const el = this.canvas;
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
    if (this.options.penOnly && e.pointerType === 'touch') {
      return;
    }

    e.preventDefault();

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    this.isDrawing = true;
    this.currentPointerId = e.pointerId;

    const pos = this.getPointerPos(e);
    this.currentStroke = [pos];
    this.renderStrokeSegment(this.currentStroke, true);
  }

  onPointerMove(e) {
    if (!this.isDrawing || e.pointerId !== this.currentPointerId) return;
    e.preventDefault();

    // 取得 Apple Pencil 高頻採樣事件 (Coalesced Events)
    let events = [e];
    if (typeof e.getCoalescedEvents === 'function') {
      const coalesced = e.getCoalescedEvents();
      if (coalesced && coalesced.length > 0) {
        events = coalesced;
      }
    }

    for (const ev of events) {
      const pos = this.getPointerPos(ev);
      const lastPos = this.currentStroke[this.currentStroke.length - 1];

      if (lastPos) {
        const dist = Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y);
        if (dist < 1.0) continue; // 過濾微小抖動
      }

      this.currentStroke.push(pos);
    }

    this.renderStrokeSegment(this.currentStroke);
  }

  onPointerUp(e) {
    if (!this.isDrawing || e.pointerId !== this.currentPointerId) return;
    e.preventDefault();

    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}

    this.isDrawing = false;
    this.currentPointerId = null;

    if (this.currentStroke.length > 0) {
      this.strokes.push({
        color: this.options.penColor,
        width: this.options.penWidth,
        isEraser: this.isEraser,
        points: [...this.currentStroke]
      });
      this.currentStroke = [];
      this.render(); // 完整重繪維持平滑抗鋸齒
      if (this.options.onStrokeEnd) this.options.onStrokeEnd();
    }
  }

  onPointerCancel(e) {
    if (e.pointerId === this.currentPointerId) {
      this.isDrawing = false;
      this.currentPointerId = null;
      this.currentStroke = [];
      this.render();
    }
  }

  /**
   * 即時渲染當前正在繪製的筆劃段落
   */
  renderStrokeSegment(points, isInitial = false) {
    if (points.length < 1) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (this.isEraser) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = this.options.penWidth * 3.5;
    } else {
      ctx.strokeStyle = this.options.penColor;
      const lastPoint = points[points.length - 1];
      const pressureFactor = (lastPoint && lastPoint.pointerType === 'pen')
        ? (0.6 + lastPoint.pressure * 0.8)
        : 1.0;
      ctx.lineWidth = this.options.penWidth * pressureFactor;
    }

    if (isInitial || points.length === 1) {
      const p = points[0];
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
    } else {
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 繪製完整筆劃（使用二次貝茲曲線平滑化）
   */
  drawSmoothStroke(stroke) {
    const points = stroke.points;
    if (!points || points.length === 0) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.isEraser) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = stroke.width * 3.5;
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
    }

    if (points.length === 1) {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 繪製背景格線
   */
  renderGrid() {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    // 底色
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (this.options.gridType === 'vertical') {
      // === 直式對齊輔助線模式 ===
      const columnCount = 6; // 輔助直式欄位 (萬、千、百、十、個位 + 符號欄)
      const colWidth = Math.min(68, Math.floor(w / 7));
      const startX = Math.max(30, w - (colWidth * columnCount) - 30);

      ctx.save();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // 垂直虛線
      for (let i = 0; i <= columnCount; i++) {
        const x = startX + i * colWidth;
        ctx.beginPath();
        ctx.moveTo(x, 15);
        ctx.lineTo(x, h - 20);
        ctx.stroke();
      }

      ctx.setLineDash([]); // 恢復實線

      // 欄位標籤 (個、十、百、千)
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const labels = ['', '千', '百', '十', '個'];
      for (let i = 1; i <= labels.length; i++) {
        const colIdx = columnCount - i;
        const x = startX + colIdx * colWidth + colWidth / 2;
        if (labels[labels.length - i]) {
          ctx.fillText(labels[labels.length - i], x, 28);
        }
      }

      // 進位/借位標註橫線
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
      ctx.beginPath();
      ctx.moveTo(startX, 36);
      ctx.lineTo(startX + columnCount * colWidth, 36);
      ctx.stroke();

      ctx.restore();

    } else if (this.options.gridType === 'grid') {
      // === 數學方格紙模式 ===
      const gridSize = 28;
      ctx.save();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
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
   * 繪製蓋印的直式題目
   */
  renderStampedProblem() {
    if (!this.stampedProblem) return;
    const { num1, num2, op } = this.stampedProblem;
    const ctx = this.ctx;
    const w = this.cssWidth;

    ctx.save();
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'right';

    // 擺在草稿紙偏右上方或適當直式計算位置
    const colWidth = 32;
    const rightMargin = 60;
    const targetX = w - rightMargin;
    const startY = 80;

    // 上數
    ctx.fillText(String(num1), targetX, startY);

    // 下數與運算子
    ctx.fillText(String(num2), targetX, startY + 45);
    ctx.textAlign = 'left';
    ctx.fillText(op, targetX - (Math.max(String(num1).length, String(num2).length) + 1) * colWidth, startY + 45);

    // 橫底線
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(targetX - (Math.max(String(num1).length, String(num2).length) + 1.2) * colWidth, startY + 58);
    ctx.lineTo(targetX + 6, startY + 58);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 完整重繪畫布
   */
  render() {
    this.renderGrid();
    this.renderStampedProblem();

    for (const stroke of this.strokes) {
      this.drawSmoothStroke(stroke);
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
    if (this.strokes.length > 0) {
      this.strokes.pop();
      this.render();
      return true;
    }
    return false;
  }

  /**
   * 清空所有手寫筆劃
   */
  clear() {
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


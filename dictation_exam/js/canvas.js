/**
 * 田字格 / 米字格 Canvas 手寫核心模組
 * 深度支援 iPad + Apple Pencil 240Hz 高頻採樣、Retina 像素對齊、微位移極速連筆與防手掌誤觸
 */
export class TianZiGeCanvas {
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

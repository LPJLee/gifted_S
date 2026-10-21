/**
 * 田字格 / 米字格 Canvas 手寫核心模組
 * 深度支援 iPad + Apple Pencil 壓感、Retina 像素對齊、筆劃保存與復原
 */
export class TianZiGeCanvas {
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

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cssWidth = width;
    this.cssHeight = height;
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
    if (this.isLocked) return;
    if (this.options.penOnly && e.pointerType === 'touch') return;

    e.preventDefault();

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    this.isDrawing = true;
    this.currentPointerId = e.pointerId;

    const pt = this.getPointerPos(e);
    this.currentStroke = [pt];
    this.drawDot(pt);
  }

  onPointerMove(e) {
    if (!this.isDrawing || e.pointerId !== this.currentPointerId) return;
    e.preventDefault();

    const pt = this.getPointerPos(e);
    const len = this.currentStroke.length;
    if (len > 0) {
      const prev = this.currentStroke[len - 1];
      this.drawSegment(prev, pt);
    }
    this.currentStroke.push(pt);
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
    ctx.save();
    ctx.fillStyle = this.options.inkColor;
    const radius = (this.options.baseStrokeWidth * (this.options.pressureSensitive ? (pt.pressure || 0.5) : 0.5)) + 1;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawSegment(p1, p2) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.options.inkColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const p = (p1.pressure + p2.pressure) / 2;
    const width = this.options.pressureSensitive
      ? this.options.baseStrokeWidth * (0.4 + p * 1.2)
      : this.options.baseStrokeWidth;

    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
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
/**
 * 田字格 / 米字格 Canvas 手寫核心模組
 * 深度支援 iPad + Apple Pencil 壓感、Retina 像素對齊、極速連筆採樣與防手掌誤觸
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
    this.strokes = []; // 儲存歷史筆劃以支援「復原 (Undo)」
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

    // 使用 { passive: false } 確保 e.preventDefault() 100% 生效，防止 iOS 瀏覽器手勢攔截與中斷筆劃
    el.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
    el.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
    el.addEventListener('pointerup', (e) => this.onPointerUp(e), { passive: false });
    el.addEventListener('pointercancel', (e) => this.onPointerCancel(e), { passive: false });
    // 移除 pointerleave，防止快速書寫筆尖掠過外框時被強制截斷！
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
    this.drawDot(pt);
  }

  onPointerMove(e) {
    if (!this.isDrawing || this.isLocked) return;
    if (this.currentPointerId !== null && e.pointerId !== this.currentPointerId) return;
    
    e.preventDefault();

    // 關鍵升級：支援 iPad Pro/Air 240Hz 高頻採樣 (getCoalescedEvents)
    // 快速運筆、連筆、撇捺時，完整捕獲所有微小座標點，絕不掉筆劃！
    const events = (e.getCoalescedEvents && e.getCoalescedEvents().length > 0)
      ? e.getCoalescedEvents()
      : [e];

    for (const ev of events) {
      const pt = this.getPointerPos(ev);
      const lastPt = this.currentStroke[this.currentStroke.length - 1];
      if (lastPt) {
        const dx = pt.x - lastPt.x;
        const dy = pt.y - lastPt.y;
        // 忽略完全重合的靜止點，微小位移即時連線
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
      this.strokes.push([...this.currentStroke]);
      this.currentStroke = [];
    }

    if (this.options.onStrokeEnd) {
      this.options.onStrokeEnd();
    }
  }

  onPointerCancel(e) {
    // 即使被作業系統強制中斷，也妥善儲存已有筆劃，防止筆跡消失
    this.onPointerUp(e);
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

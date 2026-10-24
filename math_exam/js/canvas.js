/**
 * 直式手寫草稿板 (Scratchpad Canvas)
 * 深度適配 iPad + Apple Pencil：
 * 1. 240Hz 高頻採樣 (getCoalescedEvents)、落筆即時成點與即時連線
 * 2. 數學對齊：個位、十位與垂直導引虛線、欄位標籤精準對齊
 * 3. 支援進退位輔助標註區、蓋印題目、橡皮擦、復原 (Undo) 與筆跡快照
 */

export class ScratchpadCanvas {
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
    this.strokes = []; // [ { color, width, isEraser, points: [{x,y,pressure,pointerType}] } ]
    this.currentStroke = [];
    this.stampedProblem = null; // 儲存蓋印的題目

    this.dpr = window.devicePixelRatio || 1;
    this.initCanvasSize();
    this.bindEvents();
    this.render();

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
    if (this.isLocked) return;

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

    const events = (e.getCoalescedEvents && e.getCoalescedEvents().length > 0)
      ? e.getCoalescedEvents()
      : [e];

    for (const ev of events) {
      const pt = this.getPointerPos(ev);
      const lastPt = this.currentStroke[this.currentStroke.length - 1];

      if (lastPt) {
        const dx = pt.x - lastPt.x;
        const dy = pt.y - lastPt.y;
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
    }

    if (this.options.onStrokeEnd) {
      this.options.onStrokeEnd();
    }
  }

  onPointerCancel(e) {
    this.onPointerUp(e);
  }

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

  getColumnMetrics() {
    const w = this.cssWidth;
    const h = this.cssHeight;
    const columnCount = 5; // [0: 符號, 1: 千位, 2: 百位, 3: 十位, 4: 個位]

    const colWidth = Math.min(88, Math.max(68, Math.floor((w - 50) / (columnCount + 1))));
    const totalWidth = colWidth * columnCount;
    const startX = Math.round((w - totalWidth) / 2);

    return {
      w,
      h,
      columnCount,
      colWidth,
      totalWidth,
      startX,
      colCenterX: (colIdx) => startX + colWidth * colIdx + colWidth / 2,
      lineX: (lineIdx) => startX + colWidth * lineIdx
    };
  }

  renderGrid() {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (this.options.gridType === 'vertical') {
      const m = this.getColumnMetrics();

      ctx.save();

      // 1. 垂直輔助虛線
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

      ctx.setLineDash([]);

      // 2. 欄位標籤：十、個
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const labels = [
        { col: 1, text: '', color: '#94a3b8' },
        { col: 2, text: '', color: '#94a3b8' },
        { col: 3, text: '十', color: '#2563eb' },
        { col: 4, text: '個', color: '#2563eb' }
      ];

      for (const item of labels) {
        if (!item.text) continue;
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

      // 4. 進退位標記輔助虛線
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
      ctx.fillText('進退位', m.colCenterX(2), 73);

      ctx.restore();

    } else if (this.options.gridType === 'grid') {
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

    const yRow1 = 142;
    const yRow2 = 206;
    const yCalcLine = 244;

    const drawDigits = (num, y) => {
      const s = String(num);
      const len = s.length;
      for (let i = 0; i < len; i++) {
        const digitChar = s[len - 1 - i];
        const targetCol = 4 - i;
        if (targetCol >= 0) {
          ctx.fillText(digitChar, m.colCenterX(targetCol), y);
        }
      }
    };

    drawDigits(num1, yRow1);
    drawDigits(num2, yRow2);

    ctx.fillStyle = op === '+' ? '#2563eb' : '#dc2626';
    ctx.fillText(op, m.colCenterX(2), yRow2);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(m.lineX(2) + 6, yCalcLine);
    ctx.lineTo(m.startX + m.totalWidth - 6, yCalcLine);
    ctx.stroke();

    ctx.restore();
  }

  render() {
    this.renderGrid();
    this.renderStampedProblem();

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

  stampProblem(question) {
    this.stampedProblem = question;
    this.render();
  }

  clearStampedProblem() {
    this.stampedProblem = null;
    this.render();
  }

  undo() {
    if (this.isLocked || this.strokes.length === 0) return false;
    this.strokes.pop();
    this.render();
    return true;
  }

  clear() {
    if (this.isLocked) return;
    this.strokes = [];
    this.render();
  }

  getStrokes() {
    return JSON.parse(JSON.stringify(this.strokes));
  }

  loadStrokes(strokes = [], stampedProblem = null) {
    this.strokes = strokes ? JSON.parse(JSON.stringify(strokes)) : [];
    this.stampedProblem = stampedProblem || null;
    this.render();
  }

  setPenColor(color) {
    this.options.penColor = color;
    this.isEraser = false;
  }

  setPenWidth(width) {
    this.options.penWidth = width;
  }

  setEraser(enable) {
    this.isEraser = enable;
  }

  setGridType(type) {
    this.options.gridType = type;
    this.render();
  }

  setPenOnly(enable) {
    this.options.penOnly = enable;
  }

  getSnapshot() {
    if (this.strokes.length === 0 && !this.stampedProblem) {
      return null;
    }
    return this.canvas.toDataURL('image/png');
  }

  hasStrokes() {
    return this.strokes.length > 0;
  }
}

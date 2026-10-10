/**
 * 直式手寫草稿板 (Scratchpad Canvas)
 * 深度適配 iPad + Apple Pencil：高頻採樣、防手掌誤觸、直式位數對齊輔助線、蓋印直式題型與筆跡快照
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

/**
 * 直式手寫草稿板 (Scratchpad Canvas)
 * 深度適配 iPad + Apple Pencil：
 * 1. 240Hz 高頻採樣 (getCoalescedEvents)、落筆即時成點與即時連線 (與國語聽寫同級靈敏度)
 * 2. 嚴格數學對齊：個位、十位、百位、千位與垂直導引虛線、欄位標籤 100% 精準對齊
 * 3. 支援進退位輔助標註區、蓋印直式題型、橡皮擦、復原 (Undo) 與筆跡快照
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

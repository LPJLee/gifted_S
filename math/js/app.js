import { MathEngine } from './math_engine.js';
import { ScratchpadCanvas } from './canvas.js';
import { QuizTimer } from './timer.js';
import { sound } from './sound.js';

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
    this.renderHistoryPreview();
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

    // 儲存至歷次作答歷史紀錄 (分數、平均答題秒數、模式設定)
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
      modeSummary: `${this.getDigitModeLabel(this.config.digitMode)} · ${this.getOperationLabel(this.config.operation)} · ${this.getRegroupLabel(this.config.regroupMode)}`
    };
    this.addHistoryEntry(historyItem);
    this.renderHistoryPreview();

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
    `;
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

    // 顯示最新 3 筆預覽
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

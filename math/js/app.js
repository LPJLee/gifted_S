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

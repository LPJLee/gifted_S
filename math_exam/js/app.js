/**
 * 數學加減模擬測驗 App 主控制器
 * 支援：個位進位加法、十幾退位減法、全卷跳題、iPad 草稿板、交卷前總覽、自動批改與錯題專項重測
 */

import { sound } from './sound.js';
import { QuizTimer } from './timer.js';
import { ScratchpadCanvas } from './canvas.js';
import { bankManager } from './bank.js';
import { recordsManager } from './records.js';

const STORAGE_KEY_SETTINGS = 'gifted_s_math_exam_settings';

class MathExamController {
  constructor() {
    this.settings = {
      penOnly: false,
      soundEffects: true,
      defaultCount: '20',
      defaultTimer: 'none'
    };

    this.activeExam = {
      bankId: null,
      bankName: '',
      questions: [],
      currentIndex: 0,
      isEditingFromReview: false,
      startTime: 0,
      totalTimeSec: 0,
      timerMode: 'none',
      isCountdown: false,
      duration: 0
    };

    this.currentInput = '';
    this.timer = new QuizTimer();
    this.canvas = null;

    this.initDOM();
    this.loadSettings();
    this.initCanvas();
    this.initTimerCallbacks();
    this.bindEvents();
    this.populateBankSelect();

    // 初始進入首頁
    this.showScreen('start');
  }

  initDOM() {
    // 導覽標籤與視圖
    this.navBtns = document.querySelectorAll('.nav-btn');
    this.views = {
      start: document.getElementById('view-start'),
      quiz: document.getElementById('view-quiz'),
      review: document.getElementById('view-review'),
      result: document.getElementById('view-result'),
      records: document.getElementById('view-records'),
      banks: document.getElementById('view-banks'),
      settings: document.getElementById('view-settings')
    };

    // 視圖 1: 設定首頁 (Start)
    this.selectStartBank = document.getElementById('start-bank-select');
    this.selectStartCount = document.getElementById('start-count-select');
    this.customCountWrap = document.getElementById('start-custom-count-wrap');
    this.customCountInput = document.getElementById('start-custom-count-input');
    this.selectStartOrder = document.getElementById('start-order-select');
    this.selectStartTimer = document.getElementById('start-timer-select');
    this.btnStartExam = document.getElementById('btn-start-exam');
    this.btnViewRecordsDirect = document.getElementById('btn-view-records-direct');

    // 視圖 2: 測驗作答 (Quiz)
    this.elQuizProgress = document.getElementById('quiz-progress-text');
    this.elQuizBankBadge = document.getElementById('quiz-bank-badge');
    this.elTimerPill = document.getElementById('timer-pill');
    this.elTimerText = document.getElementById('timer-text');
    this.btnQuizSubmitHead = document.getElementById('btn-quiz-submit-head');
    this.elPillStrip = document.getElementById('exam-pill-strip');
    this.elEditingBanner = document.getElementById('editing-banner');
    this.elEditingQNum = document.getElementById('editing-q-num');
    this.btnFinishEdit = document.getElementById('btn-finish-edit');

    this.problemTypeTag = document.getElementById('problem-type-tag');
    this.problemFormula = document.getElementById('problem-formula');
    this.answerDisplay = document.getElementById('answer-display');
    this.btnQuizPrev = document.getElementById('btn-quiz-prev');
    this.btnQuizNext = document.getElementById('btn-quiz-next');
    this.btnClearInput = document.getElementById('btn-clear-input');

    // 草稿板
    this.canvasEl = document.getElementById('scratchpad-canvas');
    this.btnStampFormula = document.getElementById('btn-stamp-formula');
    this.btnCanvasPen = document.getElementById('btn-canvas-pen');
    this.btnCanvasEraser = document.getElementById('btn-canvas-eraser');
    this.btnCanvasUndo = document.getElementById('btn-canvas-undo');
    this.btnCanvasClear = document.getElementById('btn-canvas-clear');
    this.gridModeBtns = document.querySelectorAll('.grid-mode-btn');

    // 視圖 3: 交卷總覽 (Review)
    this.reviewStatBadge = document.getElementById('review-stat-badge');
    this.reviewUnansweredAlert = document.getElementById('review-unanswered-alert');
    this.reviewUnansweredCount = document.getElementById('review-unanswered-count');
    this.reviewGrid = document.getElementById('review-grid');
    this.btnReviewBack = document.getElementById('btn-review-back');
    this.btnConfirmSubmit = document.getElementById('btn-confirm-submit');

    // 視圖 4: 結算 (Result)
    this.resultScoreNum = document.getElementById('result-score-num');
    this.resultScorePraise = document.getElementById('result-score-praise');
    this.resultTotalCount = document.getElementById('result-total-count');
    this.resultCorrectCount = document.getElementById('result-correct-count');
    this.resultWrongCount = document.getElementById('result-wrong-count');
    this.resultTimeSpent = document.getElementById('result-time-spent');
    this.resultAvgSpeed = document.getElementById('result-avg-speed');
    this.resultWrongSection = document.getElementById('result-wrong-section');
    this.resultWrongNum = document.getElementById('result-wrong-num');
    this.btnRetestWrongProblems = document.getElementById('btn-retest-wrong-problems');
    this.resultDetailsList = document.getElementById('result-details-list');
    this.btnRetestAll = document.getElementById('btn-retest-all');
    this.btnViewRecordsFromResult = document.getElementById('btn-view-records-from-result');

    // 視圖 5: 紀錄 (Records)
    this.statTotalTests = document.getElementById('stat-total-tests');
    this.statAvgScore = document.getElementById('stat-avg-score');
    this.statTotalWrong = document.getElementById('stat-total-wrong');
    this.statAvgSpeed = document.getElementById('stat-avg-speed');
    this.topWrongContainer = document.getElementById('top-wrong-container');
    this.btnRetestTopWrong = document.getElementById('btn-retest-top-wrong');
    this.recordsListContainer = document.getElementById('records-list-container');
    this.btnClearAllRecords = document.getElementById('btn-clear-all-records');

    // 視圖 6: 題庫 (Banks)
    this.banksCardContainer = document.getElementById('banks-card-container');
    this.btnOpenAddBank = document.getElementById('btn-open-add-bank');

    // 視圖 7: 設定 (Settings)
    this.settingPenOnly = document.getElementById('setting-pen-only');
    this.settingSound = document.getElementById('setting-sound');
    this.settingDefaultCount = document.getElementById('setting-default-count');
    this.settingDefaultTimer = document.getElementById('setting-default-timer');
    this.btnSaveSettings = document.getElementById('btn-save-settings');

    // 彈窗
    this.modalBankProblems = document.getElementById('modal-bank-problems');
    this.modalBankTitle = document.getElementById('modal-bank-title');
    this.modalBankDesc = document.getElementById('modal-bank-desc');
    this.modalBankProblemsGrid = document.getElementById('modal-bank-problems-grid');

    this.modalAddBank = document.getElementById('modal-add-bank');
    this.inputNewBankName = document.getElementById('input-new-bank-name');
    this.inputNewBankDesc = document.getElementById('input-new-bank-desc');
    this.textareaNewBankFormulas = document.getElementById('textarea-new-bank-formulas');
    this.btnQuickAddCarry = document.getElementById('btn-quick-add-carry');
    this.btnQuickAddBorrow = document.getElementById('btn-quick-add-borrow');
    this.btnSaveNewBank = document.getElementById('btn-save-new-bank');

    this.modalSnapshot = document.getElementById('modal-snapshot');
    this.modalSnapshotTitle = document.getElementById('modal-snapshot-title');
    this.modalSnapshotImg = document.getElementById('modal-snapshot-img');
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        this.settings = Object.assign(this.settings, JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }

    sound.setMuted(!this.settings.soundEffects);
    if (this.settingPenOnly) this.settingPenOnly.checked = !!this.settings.penOnly;
    if (this.settingSound) this.settingSound.checked = !!this.settings.soundEffects;
    if (this.settingDefaultCount) this.settingDefaultCount.value = this.settings.defaultCount || '20';
    if (this.settingDefaultTimer) this.settingDefaultTimer.value = this.settings.defaultTimer || 'none';

    if (this.selectStartCount) {
      this.selectStartCount.value = this.settings.defaultCount || '20';
    }
    if (this.selectStartTimer) {
      this.selectStartTimer.value = this.settings.defaultTimer || 'none';
    }
  }

  saveSettings() {
    this.settings.penOnly = this.settingPenOnly.checked;
    this.settings.soundEffects = this.settingSound.checked;
    this.settings.defaultCount = this.settingDefaultCount.value;
    this.settings.defaultTimer = this.settingDefaultTimer.value;

    sound.setMuted(!this.settings.soundEffects);
    if (this.canvas) {
      this.canvas.setPenOnly(this.settings.penOnly);
    }

    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
      sound.playCorrect();
      alert('✅ 設定已成功儲存！');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  initCanvas() {
    if (!this.canvasEl) return;
    this.canvas = new ScratchpadCanvas(this.canvasEl, {
      gridType: 'vertical',
      penColor: '#1e293b',
      penWidth: 4,
      pressureSensitive: true,
      penOnly: this.settings.penOnly
    });
  }

  initTimerCallbacks() {
    this.timer.onTick = (timeVal) => {
      const timeStr = this.timer.formatTime(timeVal);
      if (this.elTimerText) this.elTimerText.textContent = timeStr;

      if (this.activeExam.isCountdown && timeVal <= 10) {
        this.elTimerPill.classList.add('warning');
      } else {
        this.elTimerPill.classList.remove('warning');
      }
    };

    this.timer.onTimeout = () => {
      this.saveCurrentQuestionState();
      alert('⏱️ 測驗時間已到！即將進入作答總覽。');
      this.enterReview();
    };
  }

  populateBankSelect() {
    if (!this.selectStartBank) return;
    this.selectStartBank.innerHTML = '';
    const banks = bankManager.getBanks();
    const activeBank = bankManager.getActiveBank();

    for (const bank of banks) {
      const opt = document.createElement('option');
      opt.value = bank.id;
      opt.textContent = `${bank.name} (${bank.problems ? bank.problems.length : 0}題)`;
      if (activeBank && bank.id === activeBank.id) {
        opt.selected = true;
      }
      this.selectStartBank.appendChild(opt);
    }
  }

  bindEvents() {
    // 頂欄導覽分頁切換
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playTap();
        const view = btn.dataset.view;
        this.navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (view === 'quiz') {
          if (this.activeExam.questions.length > 0) {
            this.showScreen('quiz');
          } else {
            this.showScreen('start');
          }
        } else if (view === 'records') {
          this.renderRecordsScreen();
          this.showScreen('records');
        } else if (view === 'banks') {
          this.renderBanksScreen();
          this.showScreen('banks');
        } else if (view === 'settings') {
          this.showScreen('settings');
        }
      });
    });

    // 題數自訂下拉選單連動
    if (this.selectStartCount) {
      this.selectStartCount.addEventListener('change', () => {
        if (this.selectStartCount.value === 'custom') {
          this.customCountWrap.style.display = 'flex';
        } else {
          this.customCountWrap.style.display = 'none';
        }
      });
    }

    // 開始測驗按鈕
    if (this.btnStartExam) {
      this.btnStartExam.addEventListener('click', () => {
        sound.playTap();
        const bankId = this.selectStartBank.value;
        let count = this.selectStartCount.value;
        if (count === 'custom') {
          count = parseInt(this.customCountInput.value, 10) || 15;
        }
        const random = this.selectStartOrder.value === 'random';
        const timerMode = this.selectStartTimer.value;

        this.startExam({ bankId, count, random, timerMode });
      });
    }

    if (this.btnViewRecordsDirect) {
      this.btnViewRecordsDirect.addEventListener('click', () => {
        sound.playTap();
        this.navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === 'records'));
        this.renderRecordsScreen();
        this.showScreen('records');
      });
    }

    // 前往交卷前總覽按鈕
    if (this.btnQuizSubmitHead) {
      this.btnQuizSubmitHead.addEventListener('click', () => {
        sound.playTap();
        this.enterReview();
      });
    }

    // 個別修改完成按鈕
    if (this.btnFinishEdit) {
      this.btnFinishEdit.addEventListener('click', () => {
        sound.playTap();
        this.saveCurrentQuestionState();
        this.enterReview();
      });
    }

    // 題目切換 (上一題 / 下一題)
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
    if (this.btnClearInput) {
      this.btnClearInput.addEventListener('click', () => {
        sound.playTap();
        this.inputClear();
      });
    }

    // 虛擬數字鍵盤事件綁定
    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        sound.playTap();
        if (key === 'backspace') {
          this.inputBackspace();
        } else if (key === 'enter') {
          this.submitKeyAction();
        } else {
          this.inputDigit(key);
        }
      });
    });

    // 實體鍵盤監聽支援 (iPad 巧控鍵盤、外接鍵盤、桌機)
    window.addEventListener('keydown', (e) => {
      // 僅在測驗進行中處理
      if (!this.views.quiz.classList.contains('active')) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        sound.playTap();
        this.inputDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        sound.playTap();
        this.inputBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        sound.playTap();
        this.submitKeyAction();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prevQuestion();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.nextQuestion();
      }
    });

    // 草稿板工具按鈕
    if (this.btnStampFormula) {
      this.btnStampFormula.addEventListener('click', () => {
        sound.playTap();
        const q = this.activeExam.questions[this.activeExam.currentIndex];
        if (q && this.canvas) {
          this.canvas.stampProblem({
            num1: q.num1,
            num2: q.num2,
            op: q.op
          });
        }
      });
    }
    if (this.btnCanvasPen) {
      this.btnCanvasPen.addEventListener('click', () => {
        sound.playTap();
        this.btnCanvasPen.classList.add('active');
        this.btnCanvasEraser.classList.remove('active');
        if (this.canvas) this.canvas.setEraser(false);
      });
    }
    if (this.btnCanvasEraser) {
      this.btnCanvasEraser.addEventListener('click', () => {
        sound.playTap();
        this.btnCanvasEraser.classList.add('active');
        this.btnCanvasPen.classList.remove('active');
        if (this.canvas) this.canvas.setEraser(true);
      });
    }
    if (this.btnCanvasUndo) {
      this.btnCanvasUndo.addEventListener('click', () => {
        sound.playTap();
        if (this.canvas) this.canvas.undo();
      });
    }
    if (this.btnCanvasClear) {
      this.btnCanvasClear.addEventListener('click', () => {
        sound.playTap();
        if (confirm('確定要清空草稿板嗎？')) {
          if (this.canvas) this.canvas.clear();
        }
      });
    }

    // 草稿板底格切換
    this.gridModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playTap();
        this.gridModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const gridType = btn.dataset.grid;
        if (this.canvas) this.canvas.setGridType(gridType);
      });
    });

    // 總覽畫面按鈕
    if (this.btnReviewBack) {
      this.btnReviewBack.addEventListener('click', () => {
        sound.playTap();
        this.showScreen('quiz');
        this.loadQuestion(this.activeExam.currentIndex);
      });
    }
    if (this.btnConfirmSubmit) {
      this.btnConfirmSubmit.addEventListener('click', () => {
        sound.playTap();
        const unanswered = this.activeExam.questions.filter(q => q.userAnswer === '').length;
        if (unanswered > 0) {
          if (confirm(`尚有 ${unanswered} 題未填寫答案，確定要交卷評分嗎？`)) {
            this.submitExam();
          }
        } else {
          this.submitExam();
        }
      });
    }

    // 結算畫面按鈕
    if (this.btnRetestWrongProblems) {
      this.btnRetestWrongProblems.addEventListener('click', () => {
        sound.playTap();
        this.retestWrongProblems();
      });
    }
    if (this.btnRetestAll) {
      this.btnRetestAll.addEventListener('click', () => {
        sound.playTap();
        this.retestAll();
      });
    }
    if (this.btnViewRecordsFromResult) {
      this.btnViewRecordsFromResult.addEventListener('click', () => {
        sound.playTap();
        this.navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === 'records'));
        this.renderRecordsScreen();
        this.showScreen('records');
      });
    }

    // 紀錄畫面操作
    if (this.btnClearAllRecords) {
      this.btnClearAllRecords.addEventListener('click', () => {
        sound.playTap();
        if (confirm('確定要清空所有歷史測驗紀錄嗎？此動作無法復原。')) {
          recordsManager.clearAll();
          this.renderRecordsScreen();
        }
      });
    }

    // 題庫管理按鈕
    if (this.btnOpenAddBank) {
      this.btnOpenAddBank.addEventListener('click', () => {
        sound.playTap();
        this.inputNewBankName.value = '';
        this.inputNewBankDesc.value = '';
        this.textareaNewBankFormulas.value = '';
        this.modalAddBank.classList.add('active');
      });
    }
    if (this.btnQuickAddCarry) {
      this.btnQuickAddCarry.addEventListener('click', () => {
        sound.playTap();
        const samples = ['8 + 7 = 15', '9 + 6 = 15', '5 + 8 = 13', '7 + 6 = 13', '8 + 9 = 17', '6 + 7 = 13', '9 + 8 = 17', '7 + 8 = 15', '6 + 8 = 14', '9 + 9 = 18'];
        const cur = this.textareaNewBankFormulas.value.trim();
        this.textareaNewBankFormulas.value = cur ? (cur + '\n' + samples.join('\n')) : samples.join('\n');
      });
    }
    if (this.btnQuickAddBorrow) {
      this.btnQuickAddBorrow.addEventListener('click', () => {
        sound.playTap();
        const samples = ['14 - 6 = 8', '12 - 5 = 7', '15 - 8 = 7', '11 - 4 = 7', '13 - 7 = 6', '16 - 9 = 7', '10 - 4 = 6', '17 - 8 = 9', '15 - 9 = 6', '13 - 8 = 5'];
        const cur = this.textareaNewBankFormulas.value.trim();
        this.textareaNewBankFormulas.value = cur ? (cur + '\n' + samples.join('\n')) : samples.join('\n');
      });
    }
    if (this.btnSaveNewBank) {
      this.btnSaveNewBank.addEventListener('click', () => {
        sound.playTap();
        const name = this.inputNewBankName.value.trim();
        const desc = this.inputNewBankDesc.value.trim();
        const raw = this.textareaNewBankFormulas.value.trim();
        if (!name) {
          alert('請輸入題庫名稱');
          return;
        }
        if (!raw) {
          alert('請輸入題目算式');
          return;
        }

        const newBank = bankManager.addBank(name, desc, raw);
        if (newBank) {
          this.modalAddBank.classList.remove('active');
          this.populateBankSelect();
          this.renderBanksScreen();
          alert(`✅ 成功建立自訂題庫「${newBank.name}」，共 ${newBank.problems.length} 題！`);
        } else {
          alert('未能解析出有效的加減法題目，請檢查格式。');
        }
      });
    }

    // 設定頁儲存
    if (this.btnSaveSettings) {
      this.btnSaveSettings.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    // 彈窗關閉按鈕通用綁定
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playTap();
        const modalId = btn.dataset.close;
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
      });
    });
  }

  showScreen(name) {
    Object.values(this.views).forEach(v => {
      if (v) v.classList.remove('active');
    });

    if (this.views[name]) {
      this.views[name].classList.add('active');
    }

    // 若切換至作答區，重繪 Canvas
    if (name === 'quiz' && this.canvas) {
      setTimeout(() => {
        this.canvas.handleResize();
      }, 50);
    }
  }

  startExam({ bankId, count, random, timerMode }) {
    const bank = bankManager.getBankById(bankId) || bankManager.getActiveBank();
    if (!bank) {
      alert('請先選擇測驗題庫');
      return;
    }

    const rawQuestions = bankManager.pickQuestions(bank.id, count, random);
    if (rawQuestions.length === 0) {
      alert('該題庫無可用題目');
      return;
    }

    this.activeExam = {
      bankId: bank.id,
      bankName: bank.name,
      questions: rawQuestions.map((q, idx) => ({
        id: q.id,
        num1: q.num1,
        op: q.op,
        num2: q.num2,
        answer: q.answer,
        isRegroup: q.isRegroup,
        userAnswer: '',
        strokes: [],
        snapshot: null,
        isCorrect: false
      })),
      currentIndex: 0,
      isEditingFromReview: false,
      startTime: Date.now(),
      totalTimeSec: 0,
      timerMode: timerMode
    };

    // 設定計時器
    let duration = 0;
    let isCountdown = false;
    if (timerMode === 'total_3') {
      duration = 180;
      isCountdown = true;
    } else if (timerMode === 'total_5') {
      duration = 300;
      isCountdown = true;
    } else if (timerMode === 'total_10') {
      duration = 600;
      isCountdown = true;
    } else if (timerMode === 'per_15') {
      duration = 15;
      isCountdown = true;
    } else if (timerMode === 'per_30') {
      duration = 30;
      isCountdown = true;
    }

    this.activeExam.isCountdown = isCountdown;
    this.activeExam.duration = duration;

    this.timer.setMode(duration, isCountdown);
    this.timer.start();

    // 更新頂部資訊
    this.elQuizBankBadge.textContent = bank.name;
    this.elEditingBanner.style.display = 'none';

    this.renderPillStrip();
    this.showScreen('quiz');
    this.loadQuestion(0);
  }

  renderPillStrip() {
    if (!this.elPillStrip) return;
    this.elPillStrip.innerHTML = '';

    this.activeExam.questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.className = 'exam-pill-btn';
      btn.textContent = idx + 1;
      btn.dataset.idx = idx;
      if (idx === this.activeExam.currentIndex) {
        btn.classList.add('active');
      }
      if (q.userAnswer !== '') {
        btn.classList.add('has-answer');
      }

      btn.addEventListener('click', () => {
        sound.playTap();
        this.saveCurrentQuestionState();
        this.loadQuestion(idx);
      });

      this.elPillStrip.appendChild(btn);
    });
  }

  updatePillStrip() {
    const pills = this.elPillStrip.querySelectorAll('.exam-pill-btn');
    pills.forEach((p, idx) => {
      const q = this.activeExam.questions[idx];
      p.classList.toggle('active', idx === this.activeExam.currentIndex);
      p.classList.toggle('has-answer', q && q.userAnswer !== '');
    });
  }

  loadQuestion(index) {
    if (index < 0 || index >= this.activeExam.questions.length) return;

    this.activeExam.currentIndex = index;
    const q = this.activeExam.questions[index];

    // 更新進度與算式
    this.elQuizProgress.textContent = `第 ${index + 1} 題 / 共 ${this.activeExam.questions.length} 題`;
    this.problemFormula.textContent = `${q.num1} ${q.op} ${q.num2} = ?`;

    // 題型標籤
    if (q.op === '+') {
      this.problemTypeTag.textContent = q.isRegroup ? '個位進位加法' : '個位加法';
      this.problemTypeTag.style.background = '#eff6ff';
      this.problemTypeTag.style.color = '#2563eb';
    } else {
      this.problemTypeTag.textContent = q.isRegroup ? '十幾退位減法' : '十幾減法';
      this.problemTypeTag.style.background = '#fef2f2';
      this.problemTypeTag.style.color = '#dc2626';
    }

    // 載入填寫的答案
    this.currentInput = (q.userAnswer !== undefined) ? String(q.userAnswer) : '';
    this.updateAnswerDisplay();

    // 更新導航按鈕狀態
    this.btnQuizPrev.disabled = (index === 0);
    this.btnQuizNext.textContent = (index === this.activeExam.questions.length - 1) ? '交卷核對 ➔' : '下一題 ➔';

    // 載入草稿筆劃快照
    if (this.canvas) {
      this.canvas.loadStrokes(q.strokes, { num1: q.num1, num2: q.num2, op: q.op });
    }

    this.updatePillStrip();
  }

  saveCurrentQuestionState() {
    if (this.activeExam.questions.length === 0) return;
    const q = this.activeExam.questions[this.activeExam.currentIndex];
    if (!q) return;

    q.userAnswer = this.currentInput;
    if (this.canvas) {
      q.strokes = this.canvas.getStrokes();
      q.snapshot = this.canvas.getSnapshot();
    }

    this.updatePillStrip();
  }

  prevQuestion() {
    if (this.activeExam.currentIndex > 0) {
      this.saveCurrentQuestionState();
      this.loadQuestion(this.activeExam.currentIndex - 1);
    }
  }

  nextQuestion() {
    this.saveCurrentQuestionState();
    if (this.activeExam.currentIndex < this.activeExam.questions.length - 1) {
      this.loadQuestion(this.activeExam.currentIndex + 1);
    } else {
      this.enterReview();
    }
  }

  inputDigit(digit) {
    if (this.currentInput.length >= 3) return; // 20以內運算答案最大為 18
    this.currentInput += String(digit);
    this.updateAnswerDisplay();
  }

  inputBackspace() {
    if (this.currentInput.length > 0) {
      this.currentInput = this.currentInput.slice(0, -1);
      this.updateAnswerDisplay();
    }
  }

  inputClear() {
    this.currentInput = '';
    this.updateAnswerDisplay();
  }

  submitKeyAction() {
    this.nextQuestion();
  }

  updateAnswerDisplay() {
    if (this.currentInput === '') {
      this.answerDisplay.textContent = '?';
      this.answerDisplay.style.color = '#94a3b8';
      this.answerDisplay.style.borderColor = '#cbd5e1';
    } else {
      this.answerDisplay.textContent = this.currentInput;
      this.answerDisplay.style.color = '#2563eb';
      this.answerDisplay.style.borderColor = '#2563eb';
    }
  }

  enterReview() {
    this.saveCurrentQuestionState();
    this.renderReviewGrid();
    this.showScreen('review');
  }

  renderReviewGrid() {
    if (!this.reviewGrid) return;
    this.reviewGrid.innerHTML = '';

    const questions = this.activeExam.questions;
    const answeredCount = questions.filter(q => q.userAnswer !== '').length;
    const totalCount = questions.length;
    const unansweredCount = totalCount - answeredCount;

    this.reviewStatBadge.textContent = `已完成：${answeredCount} / ${totalCount} 題`;

    if (unansweredCount > 0) {
      this.reviewUnansweredAlert.style.display = 'block';
      this.reviewUnansweredCount.textContent = unansweredCount;
    } else {
      this.reviewUnansweredAlert.style.display = 'none';
    }

    questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'review-card' + (q.userAnswer === '' ? ' unanswered' : '');

      const hasAns = q.userAnswer !== '';
      card.innerHTML = `
        <div class="review-card-head">
          <span class="review-q-num">第 ${idx + 1} 題</span>
          <span style="font-size: 0.8rem; font-weight: 700; color: ${q.op === '+' ? '#2563eb' : '#dc2626'};">${q.op === '+' ? '加法' : '退位減法'}</span>
        </div>
        <div class="review-card-formula">${q.num1} ${q.op} ${q.num2} = </div>
        <div class="review-card-ans ${hasAns ? '' : 'empty'}">${hasAns ? q.userAnswer : '⚠️ 未填寫'}</div>
        <button class="review-card-btn" data-edit-idx="${idx}">✏️ 修改此題</button>
      `;

      card.querySelector('.review-card-btn').addEventListener('click', () => {
        sound.playTap();
        this.activeExam.isEditingFromReview = true;
        this.elEditingBanner.style.display = 'flex';
        this.elEditingQNum.textContent = idx + 1;
        this.showScreen('quiz');
        this.loadQuestion(idx);
      });

      this.reviewGrid.appendChild(card);
    });
  }

  submitExam() {
    this.timer.stop();
    const timeSpent = this.timer.getElapsedSeconds();
    this.activeExam.totalTimeSec = timeSpent;

    let correctCount = 0;
    const wrongProblems = [];

    this.activeExam.questions.forEach(q => {
      const userVal = parseInt(q.userAnswer, 10);
      const isCorrect = (userVal === q.answer);
      q.isCorrect = isCorrect;

      if (isCorrect) {
        correctCount++;
      } else {
        wrongProblems.push({
          num1: q.num1,
          op: q.op,
          num2: q.num2,
          answer: q.answer,
          userAnswer: q.userAnswer
        });
      }
    });

    const totalCount = this.activeExam.questions.length;
    const wrongCount = totalCount - correctCount;
    const score = Math.round((correctCount / totalCount) * 100);

    // 儲存至歷次紀錄庫
    recordsManager.addRecord({
      bankName: this.activeExam.bankName,
      totalCount: totalCount,
      correctCount: correctCount,
      wrongCount: wrongCount,
      score: score,
      timeSpentSec: timeSpent,
      wrongProblems: wrongProblems,
      items: this.activeExam.questions
    });

    sound.playComplete();
    this.renderResultScreen({ score, totalCount, correctCount, wrongCount, timeSpent, wrongProblems });
    this.showScreen('result');
  }

  renderResultScreen({ score, totalCount, correctCount, wrongCount, timeSpent, wrongProblems }) {
    this.resultScoreNum.textContent = `${score} 分`;
    if (score === 100) {
      this.resultScorePraise.textContent = '太棒了！滿分全對！🌟 表現卓越！';
    } else if (score >= 80) {
      this.resultScorePraise.textContent = '很優秀！基本功非常扎實！💪';
    } else if (score >= 60) {
      this.resultScorePraise.textContent = '及格了！多練習退位借位會更加熟練！👍';
    } else {
      this.resultScorePraise.textContent = '繼續加油！建議重測本次錯題加強記憶！🎯';
    }

    this.resultTotalCount.textContent = `共 ${totalCount} 題`;
    this.resultCorrectCount.textContent = `答對 ${correctCount} 題`;
    this.resultWrongCount.textContent = `答錯 ${wrongCount} 題`;
    this.resultTimeSpent.textContent = `總用時 ${this.timer.formatTime(timeSpent)}`;
    const avgSec = totalCount > 0 ? (timeSpent / totalCount).toFixed(1) : '0';
    this.resultAvgSpeed.textContent = `平均 ${avgSec} 秒/題`;

    // 錯題專項重測區
    if (wrongCount > 0) {
      this.resultWrongSection.style.display = 'block';
      this.resultWrongNum.textContent = wrongCount;
    } else {
      this.resultWrongSection.style.display = 'none';
    }

    // 逐題詳解清單
    this.resultDetailsList.innerHTML = '';
    this.activeExam.questions.forEach((q, idx) => {
      const row = document.createElement('div');
      row.className = 'result-detail-row ' + (q.isCorrect ? 'correct' : 'wrong');

      const userAnsText = q.userAnswer !== '' ? q.userAnswer : '未填答';

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.25rem;">${q.isCorrect ? '✅' : '❌'}</span>
          <div>
            <div class="detail-formula">${q.num1} ${q.op} ${q.num2} = ${q.answer}</div>
            <div style="font-size: 0.8rem; color: #64748b;">${q.op === '+' ? (q.isRegroup ? '個位進位加法' : '個位加法') : '十幾退位減法'}</div>
          </div>
        </div>
        <div class="detail-answer-wrap">
          <span>你的答案：<strong class="detail-user-ans ${q.isCorrect ? 'correct' : 'wrong'}">${userAnsText}</strong></span>
          ${!q.isCorrect ? `<span>正確答案：<strong class="detail-correct-ans">${q.answer}</strong></span>` : ''}
          ${q.snapshot ? `<button class="tool-btn btn-view-snap" data-snap-idx="${idx}" style="padding: 4px 10px; font-size: 0.8rem;">📝 查看草稿</button>` : ''}
        </div>
      `;

      if (q.snapshot) {
        row.querySelector('.btn-view-snap').addEventListener('click', () => {
          this.openSnapshotModal(q.snapshot, `第 ${idx + 1} 題：${q.num1} ${q.op} ${q.num2} 草稿筆劃`);
        });
      }

      this.resultDetailsList.appendChild(row);
    });
  }

  retestWrongProblems() {
    const wrongQs = this.activeExam.questions.filter(q => !q.isCorrect);
    if (wrongQs.length === 0) return;

    this.activeExam.questions = wrongQs.map((q, idx) => ({
      id: q.id,
      num1: q.num1,
      op: q.op,
      num2: q.num2,
      answer: q.answer,
      isRegroup: q.isRegroup,
      userAnswer: '',
      strokes: [],
      snapshot: null,
      isCorrect: false
    }));

    this.activeExam.currentIndex = 0;
    this.activeExam.startTime = Date.now();
    this.timer.reset();
    this.timer.start();

    this.renderPillStrip();
    this.showScreen('quiz');
    this.loadQuestion(0);
  }

  retestAll() {
    this.startExam({
      bankId: this.activeExam.bankId,
      count: this.activeExam.questions.length,
      random: true,
      timerMode: this.activeExam.timerMode
    });
  }

  renderRecordsScreen() {
    const stats = recordsManager.getOverallStats();
    this.statTotalTests.textContent = stats.totalTests;
    this.statAvgScore.textContent = `${stats.avgScore} 分`;
    this.statTotalWrong.textContent = `${stats.totalWrongCount} 題`;
    this.statAvgSpeed.textContent = `${stats.avgSpeed} 秒/題`;

    // 易錯算式排行
    const topWrongs = recordsManager.getTopWrongProblems(8);
    this.topWrongContainer.innerHTML = '';
    if (topWrongs.length === 0) {
      this.topWrongContainer.innerHTML = '<span style="color: #94a3b8; font-size: 0.95rem;">尚無錯題紀錄，繼續保持！🌟</span>';
    } else {
      topWrongs.forEach(item => {
        const pill = document.createElement('div');
        pill.className = 'ranking-pill';
        pill.innerHTML = `<span>${item.num1} ${item.op} ${item.num2} = ${item.answer}</span> <small style="opacity: 0.85;">(${item.count}次)</small>`;
        this.topWrongContainer.appendChild(pill);
      });
    }

    // 歷史紀錄清單
    const records = recordsManager.getRecords();
    this.recordsListContainer.innerHTML = '';

    if (records.length === 0) {
      this.recordsListContainer.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 24px;">尚無測驗紀錄，前往首頁開始第一次練習吧！</div>';
      return;
    }

    records.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'record-item-card';

      let scoreClass = 'mid';
      if (rec.score >= 90) scoreClass = 'high';
      else if (rec.score < 60) scoreClass = 'low';

      card.innerHTML = `
        <div class="record-info">
          <div class="record-title">${rec.bankName}</div>
          <div class="record-meta">${rec.dateStr} · 共 ${rec.totalCount} 題 · 答對 ${rec.correctCount} 題 · 用時 ${this.timer.formatTime(rec.timeSpentSec)}</div>
          ${rec.wrongProblems && rec.wrongProblems.length > 0 ? `
            <div style="margin-top: 6px; font-size: 0.85rem; color: #dc2626;">
              錯題：${rec.wrongProblems.map(w => `${w.num1}${w.op}${w.num2}`).join('、')}
            </div>
          ` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="record-badge-score ${scoreClass}">${rec.score} 分</div>
          <button class="tool-btn danger btn-del-record" data-rec-id="${rec.id}" title="刪除此筆紀錄" style="padding: 6px 10px;">🗑️</button>
        </div>
      `;

      card.querySelector('.btn-del-record').addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playTap();
        if (confirm('確定要刪除這筆測驗紀錄嗎？')) {
          recordsManager.deleteRecord(rec.id);
          this.renderRecordsScreen();
        }
      });

      this.recordsListContainer.appendChild(card);
    });
  }

  renderBanksScreen() {
    const banks = bankManager.getBanks();
    this.banksCardContainer.innerHTML = '';

    banks.forEach(bank => {
      const card = document.createElement('div');
      card.className = 'bank-card';

      card.innerHTML = `
        <div>
          <div class="bank-card-title">${bank.name}</div>
          <p class="bank-card-desc">${bank.description}</p>
        </div>
        <div class="bank-card-footer">
          <span style="font-size: 0.85rem; font-weight: 700; color: #2563eb;">共 ${bank.problems.length} 道精選題目</span>
          <div style="display: flex; gap: 8px;">
            <button class="tool-btn btn-view-bank-problems" data-bank-id="${bank.id}" style="padding: 6px 12px; font-size: 0.85rem;">查看題目</button>
            ${!bank.isPreset ? `<button class="tool-btn danger btn-del-bank" data-bank-id="${bank.id}" style="padding: 6px 10px; font-size: 0.85rem;">🗑️</button>` : ''}
          </div>
        </div>
      `;

      card.querySelector('.btn-view-bank-problems').addEventListener('click', () => {
        sound.playTap();
        this.openBankProblemsModal(bank.id);
      });

      const delBtn = card.querySelector('.btn-del-bank');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          sound.playTap();
          if (confirm(`確定要刪除自訂題庫「${bank.name}」嗎？`)) {
            bankManager.deleteBank(bank.id);
            this.populateBankSelect();
            this.renderBanksScreen();
          }
        });
      }

      this.banksCardContainer.appendChild(card);
    });
  }

  openBankProblemsModal(bankId) {
    const bank = bankManager.getBankById(bankId);
    if (!bank) return;

    this.modalBankTitle.textContent = bank.name;
    this.modalBankDesc.textContent = `${bank.description} (共 ${bank.problems.length} 題)`;
    this.modalBankProblemsGrid.innerHTML = '';

    bank.problems.forEach(p => {
      const pill = document.createElement('div');
      pill.className = 'problem-pill';
      pill.textContent = `${p.num1} ${p.op} ${p.num2} = ${p.answer}`;
      this.modalBankProblemsGrid.appendChild(pill);
    });

    this.modalBankProblems.classList.add('active');
  }

  openSnapshotModal(dataUrl, title) {
    this.modalSnapshotTitle.textContent = title || '手寫草稿筆劃檢視';
    this.modalSnapshotImg.src = dataUrl;
    this.modalSnapshot.classList.add('active');
  }
}

// 啟動主控制器
window.addEventListener('DOMContentLoaded', () => {
  window.app = new MathExamController();
});

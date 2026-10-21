/**
 * 國語生字聽寫測驗 App (Exam Mode) 主應用控制器
 * 支援：全卷作答、交卷總覽、個別修改、逐題批改、錯題純文字記錄與錯題本
 */
import { TianZiGeCanvas } from './canvas.js';
import { speech } from './speech.js';
import { QuizTimer } from './timer.js';
import { bankManager } from './bank.js';
import { recordsManager } from './records.js';
import { sound } from './sound.js';

const STORAGE_KEY_SETTINGS = 'gifted_s_exam_settings';

class ExamAppController {
  constructor() {
    this.settings = {
      countdownSeconds: 30,
      gridType: 'tian',        // 'tian' 或 'mi'
      gridSize: 'comfortable', // 'compact' (80px), 'comfortable' (150px), 'large' (200px)
      speechRate: 0.85,
      speechVolume: 1.0,
      voiceURI: '',
      penOnly: false,
      soundEffects: true,
      defaultQuestionCount: 20,
      randomOrder: true,
      timerMode: 'none',       // 'none', 'total', 'per_question'
      totalMinutes: 10
    };

    // 測驗即時狀態
    this.activeExam = {
      bankName: '',
      questions: [],           // [{ index, word, chars, strokes, hasWritten, snapshot, isCorrect }]
      currentIndex: 0,
      isEditingFromReview: false,
      startTime: 0,
      totalTimeSec: 0
    };

    this.currentCanvases = [];
    this.timer = new QuizTimer();

    this.initDOM();
    this.loadSettings();
    this.initTimerCallbacks();
    this.bindEvents();

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.populateVoiceList();
      };
    }

    // 初始進入測驗設定主頁
    this.showStartScreen();
  }

  initDOM() {
    // 頂欄導覽
    this.navBtns = document.querySelectorAll('.nav-btn');
    this.views = {
      start: document.getElementById('view-start'),
      quiz: document.getElementById('view-quiz'),
      review: document.getElementById('view-review'),
      grading: document.getElementById('view-grading'),
      result: document.getElementById('view-result'),
      records: document.getElementById('view-records'),
      banks: document.getElementById('view-banks'),
      settings: document.getElementById('view-settings')
    };

    // 測驗設定頁 (Start)
    this.selectStartBank = document.getElementById('start-bank-select');
    this.selectStartCount = document.getElementById('start-count-select');
    this.selectStartOrder = document.getElementById('start-order-select');
    this.selectStartTimer = document.getElementById('start-timer-select');
    this.btnStartExam = document.getElementById('btn-start-exam');
    this.btnViewRecordsDirect = document.getElementById('btn-view-records-direct');

    // 聽寫作答區 (Quiz)
    this.elQuizProgress = document.getElementById('quiz-progress-text');
    this.elQuizBankBadge = document.getElementById('quiz-bank-badge');
    this.elTimerPill = document.getElementById('timer-pill');
    this.elTimerText = document.getElementById('timer-text');
    this.elPillStrip = document.getElementById('exam-pill-strip');
    this.elEditingBanner = document.getElementById('editing-banner');
    this.elEditingQNum = document.getElementById('editing-q-num');
    this.btnFinishEdit = document.getElementById('btn-finish-edit');
    this.elGridContainer = document.getElementById('tian-grid-container');
    this.btnClearCanvas = document.getElementById('btn-clear-canvas');
    this.btnUndoStroke = document.getElementById('btn-undo-stroke');
    this.btnPlayVoice = document.getElementById('btn-play-voice');
    this.btnQuizPrev = document.getElementById('btn-quiz-prev');
    this.btnQuizNext = document.getElementById('btn-quiz-next');
    this.btnQuizSubmitHead = document.getElementById('btn-quiz-submit-head');

    // 交卷總覽 (Review)
    this.elReviewStatBadge = document.getElementById('review-stat-badge');
    this.elReviewGrid = document.getElementById('review-grid');
    this.btnReviewBack = document.getElementById('btn-review-back');
    this.btnConfirmSubmit = document.getElementById('btn-confirm-submit');

    // 逐題批改 (Grading)
    this.elGradingLiveScore = document.getElementById('grading-live-score');
    this.elGradeCorrectCount = document.getElementById('grade-correct-count');
    this.elGradeWrongCount = document.getElementById('grade-wrong-count');
    this.elGradingList = document.getElementById('grading-list');
    this.btnFinishGrading = document.getElementById('btn-finish-grading');

    // 結算與錯題展示 (Result)
    this.elResultScoreNum = document.getElementById('result-score-num');
    this.elResultScorePraise = document.getElementById('result-score-praise');
    this.elResultTotalCount = document.getElementById('result-total-count');
    this.elResultCorrectCount = document.getElementById('result-correct-count');
    this.elResultWrongCount = document.getElementById('result-wrong-count');
    this.elResultTimeSpent = document.getElementById('result-time-spent');
    this.elWrongWordsContainer = document.getElementById('wrong-words-container');
    this.btnRetestWrongWords = document.getElementById('btn-retest-wrong-words');
    this.btnRetestAll = document.getElementById('btn-retest-all');
    this.btnViewRecordsFromResult = document.getElementById('btn-view-records-from-result');

    // 歷次紀錄 (Records)
    this.elStatTotalTests = document.getElementById('stat-total-tests');
    this.elStatAvgScore = document.getElementById('stat-avg-score');
    this.elStatTotalWrong = document.getElementById('stat-total-wrong');
    this.elRankingWrap = document.getElementById('ranking-pills-wrap');
    this.elHistoryList = document.getElementById('history-records-list');
    this.btnClearAllRecords = document.getElementById('btn-clear-all-records');

    // 題庫管理 (Banks)
    this.btnNewBank = document.getElementById('btn-new-bank');
    this.btnExportBanks = document.getElementById('btn-export-banks');
    this.fileImportInput = document.getElementById('file-import-input');
    this.elBankListContainer = document.getElementById('bank-list-container');
  }

  loadSettings() {
    try {
      // 優先載入專屬設定，若無則繼承 gifted_s_settings
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem('gifted_s_settings');
      if (saved) {
        this.settings = Object.assign(this.settings, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    this.applySettingsToUI();
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
    } catch (e) {}
    this.applySettingsToUI();
  }

  applySettingsToUI() {
    let sizePx = '150px';
    if (this.settings.gridSize === 'compact') sizePx = '80px';
    if (this.settings.gridSize === 'large') sizePx = '200px';
    document.documentElement.style.setProperty('--grid-size', sizePx);

    speech.setRate(this.settings.speechRate);
    speech.setVolume(this.settings.speechVolume !== undefined ? this.settings.speechVolume : 1.0);
    if (this.settings.voiceURI) {
      speech.setVoice(this.settings.voiceURI);
    }
    sound.enabled = !!this.settings.soundEffects;

    // 設定面板控制項同步
    const inputTimer = document.getElementById('setting-timer');
    const selectGridSize = document.getElementById('setting-grid-size');
    const selectGridType = document.getElementById('setting-grid-type');
    const checkPenOnly = document.getElementById('setting-pen-only');
    const checkSound = document.getElementById('setting-sound');
    const selectRate = document.getElementById('setting-speech-rate');

    if (inputTimer && document.activeElement !== inputTimer) inputTimer.value = this.settings.countdownSeconds;
    if (selectGridSize) selectGridSize.value = this.settings.gridSize;
    if (selectGridType) selectGridType.value = this.settings.gridType;
    if (checkPenOnly) checkPenOnly.checked = !!this.settings.penOnly;
    if (checkSound) checkSound.checked = !!this.settings.soundEffects;
    if (selectRate) selectRate.value = this.settings.speechRate;

    this.populateVoiceList();
  }

  populateVoiceList() {
    const selectVoice = document.getElementById('setting-voice');
    if (!selectVoice) return;
    const voices = speech.getChineseVoices();
    const currentVal = this.settings.voiceURI || (speech.twVoice ? speech.twVoice.voiceURI : '');

    selectVoice.innerHTML = '<option value="">自動推薦 (優先臺灣人聲)</option>';
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (v.voiceURI === currentVal) opt.selected = true;
      selectVoice.appendChild(opt);
    });
  }

  initTimerCallbacks() {
    this.timer.onTick = (timeVal) => {
      if (this.elTimerText) {
        this.elTimerText.textContent = this.timer.formatTime(timeVal);
      }
      if (this.timer.isCountdown && timeVal <= 10) {
        this.elTimerPill?.classList.add('warning');
      } else {
        this.elTimerPill?.classList.remove('warning');
      }
    };

    this.timer.onTimeout = () => {
      if (this.settings.timerMode === 'total') {
        alert('⏱️ 全卷測驗總時間結束！將為您自動交卷總覽檢查。');
        this.handleEnterReview();
      } else if (this.settings.timerMode === 'per_question') {
        alert('⏱️ 本題作答時間結束！自動進入下一題。');
        this.handleNextQuestion();
      }
    };
  }

  bindEvents() {
    // 頂欄分頁切換
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playTap();
        const view = btn.dataset.view;
        if (view === 'quiz') {
          if (this.activeExam.questions.length > 0) {
            this.switchView('quiz');
          } else {
            this.showStartScreen();
          }
        } else if (view === 'records') {
          this.showRecordsScreen();
        } else if (view === 'banks') {
          this.showBanksScreen();
        } else if (view === 'settings') {
          this.switchView('settings');
        }
      });
    });

    // 測驗設定主頁 (Start)
    if (this.btnStartExam) {
      this.btnStartExam.addEventListener('click', () => {
        sound.playTap();
        this.startNewExam();
      });
    }
    if (this.btnViewRecordsDirect) {
      this.btnViewRecordsDirect.addEventListener('click', () => {
        sound.playTap();
        this.showRecordsScreen();
      });
    }

    // 聽寫作答區 (Quiz)
    if (this.btnPlayVoice) {
      this.btnPlayVoice.addEventListener('click', () => {
        this.handlePlayVoice();
      });
    }

    if (this.btnClearCanvas) {
      this.btnClearCanvas.addEventListener('click', () => {
        sound.playTap();
        this.currentCanvases.forEach(c => c.clear());
      });
    }

    if (this.btnUndoStroke) {
      this.btnUndoStroke.addEventListener('click', () => {
        sound.playTap();
        this.currentCanvases.forEach(c => c.undo());
      });
    }

    if (this.btnQuizPrev) {
      this.btnQuizPrev.addEventListener('click', () => {
        sound.playTap();
        if (this.activeExam.currentIndex > 0) {
          this.saveCurrentQuestionHandwriting();
          this.loadQuestion(this.activeExam.currentIndex - 1);
        }
      });
    }

    if (this.btnQuizNext) {
      this.btnQuizNext.addEventListener('click', () => {
        sound.playTap();
        this.handleNextQuestion();
      });
    }

    if (this.btnQuizSubmitHead) {
      this.btnQuizSubmitHead.addEventListener('click', () => {
        sound.playTap();
        this.handleEnterReview();
      });
    }

    if (this.btnFinishEdit) {
      this.btnFinishEdit.addEventListener('click', () => {
        sound.playTap();
        this.saveCurrentQuestionHandwriting();
        this.handleEnterReview();
      });
    }

    // 交卷總覽 (Review)
    if (this.btnReviewBack) {
      this.btnReviewBack.addEventListener('click', () => {
        sound.playTap();
        this.switchView('quiz');
        this.loadQuestion(this.activeExam.currentIndex);
      });
    }

    if (this.btnConfirmSubmit) {
      this.btnConfirmSubmit.addEventListener('click', () => {
        sound.playTap();
        this.handleConfirmSubmit();
      });
    }

    // 逐題批改 (Grading)
    if (this.btnFinishGrading) {
      this.btnFinishGrading.addEventListener('click', () => {
        sound.playTap();
        this.finishGradingAndSave();
      });
    }

    // 結算結果 (Result)
    if (this.btnRetestWrongWords) {
      this.btnRetestWrongWords.addEventListener('click', () => {
        sound.playTap();
        this.retestWrongWords();
      });
    }

    if (this.btnRetestAll) {
      this.btnRetestAll.addEventListener('click', () => {
        sound.playTap();
        this.startNewExam();
      });
    }

    if (this.btnViewRecordsFromResult) {
      this.btnViewRecordsFromResult.addEventListener('click', () => {
        sound.playTap();
        this.showRecordsScreen();
      });
    }

    // 歷次紀錄 (Records)
    if (this.btnClearAllRecords) {
      this.btnClearAllRecords.addEventListener('click', () => {
        if (confirm('確定要清空所有的測驗歷史紀錄嗎？清空後無法復原。')) {
          sound.playTap();
          recordsManager.clearAll();
          this.showRecordsScreen();
        }
      });
    }

    // 題庫管理按鈕
    if (this.btnNewBank) {
      this.btnNewBank.addEventListener('click', () => this.handleNewBankModal());
    }
    if (this.btnExportBanks) {
      this.btnExportBanks.addEventListener('click', () => bankManager.exportJSON());
    }
    if (this.fileImportInput) {
      this.fileImportInput.addEventListener('change', (e) => this.handleImportBanks(e));
    }

    // 設定表單事件
    const inputTimer = document.getElementById('setting-timer');
    if (inputTimer) {
      inputTimer.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        if (val >= 5 && val <= 300) {
          this.settings.countdownSeconds = val;
          this.saveSettings();
        }
      });
    }

    const selectGridSize = document.getElementById('setting-grid-size');
    if (selectGridSize) {
      selectGridSize.addEventListener('change', (e) => {
        this.settings.gridSize = e.target.value;
        this.saveSettings();
      });
    }

    const selectGridType = document.getElementById('setting-grid-type');
    if (selectGridType) {
      selectGridType.addEventListener('change', (e) => {
        this.settings.gridType = e.target.value;
        this.saveSettings();
      });
    }

    const checkPenOnly = document.getElementById('setting-pen-only');
    if (checkPenOnly) {
      checkPenOnly.addEventListener('change', (e) => {
        this.settings.penOnly = e.target.checked;
        this.saveSettings();
      });
    }

    const checkSound = document.getElementById('setting-sound');
    if (checkSound) {
      checkSound.addEventListener('change', (e) => {
        this.settings.soundEffects = e.target.checked;
        this.saveSettings();
      });
    }

    const selectRate = document.getElementById('setting-speech-rate');
    if (selectRate) {
      selectRate.addEventListener('change', (e) => {
        this.settings.speechRate = parseFloat(e.target.value) || 0.85;
        this.saveSettings();
      });
    }

    const selectVoice = document.getElementById('setting-voice');
    if (selectVoice) {
      selectVoice.addEventListener('change', (e) => {
        this.settings.voiceURI = e.target.value;
        this.saveSettings();
      });
    }
  }

  switchView(viewName) {
    speech.stop();
    Object.keys(this.views).forEach(key => {
      if (this.views[key]) {
        this.views[key].classList.toggle('active', key === viewName);
      }
    });

    this.navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
  }

  // ================= 測驗主頁與準備 =================
  showStartScreen() {
    this.switchView('start');

    // 填充題庫下拉選單
    if (this.selectStartBank) {
      const banks = bankManager.getBanks();
      const activeBank = bankManager.getActiveBank();
      this.selectStartBank.innerHTML = '';
      banks.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.name} (${b.words.length}字詞)`;
        if (activeBank && activeBank.id === b.id) opt.selected = true;
        this.selectStartBank.appendChild(opt);
      });
    }
  }

  startNewExam(customWords = null, customBankName = null) {
    let words = [];
    let bankName = '';

    if (customWords && customWords.length > 0) {
      words = [...customWords];
      bankName = customBankName || '錯題重測專區';
    } else {
      const bankId = this.selectStartBank ? this.selectStartBank.value : null;
      if (bankId) bankManager.setActiveBank(bankId);
      const bank = bankManager.getActiveBank();

      if (!bank || !bank.words || bank.words.length === 0) {
        alert('選擇的題庫沒有生字，請先至「題庫管理」新增生字詞語！');
        this.showBanksScreen();
        return;
      }

      bankName = bank.name;
      words = [...bank.words];

      // 順序或隨機
      const isRandom = this.selectStartOrder ? (this.selectStartOrder.value === 'random') : this.settings.randomOrder;
      if (isRandom) {
        for (let i = words.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [words[i], words[j]] = [words[j], words[i]];
        }
      }

      // 題數截取
      const countVal = this.selectStartCount ? this.selectStartCount.value : '20';
      if (countVal !== 'all') {
        const limit = parseInt(countVal, 10) || 20;
        if (words.length > limit) {
          words = words.slice(0, limit);
        }
      }
    }

    // 初始化測驗題目結構
    this.activeExam = {
      bankName: bankName,
      questions: words.map((w, idx) => ({
        index: idx,
        word: w,
        chars: w.split(''),
        strokes: [], // 每個字的筆劃陣列
        hasWritten: false,
        snapshot: null,
        isCorrect: true // 批改時預設正確
      })),
      currentIndex: 0,
      isEditingFromReview: false,
      startTime: Date.now(),
      totalTimeSec: 0
    };

    // 計時器設定
    const timerMode = this.selectStartTimer ? this.selectStartTimer.value : this.settings.timerMode;
    this.settings.timerMode = timerMode;

    if (timerMode === 'total') {
      const totalSec = (this.settings.totalMinutes || 10) * 60;
      this.timer.setMode(totalSec, true);
      this.timer.start();
    } else if (timerMode === 'per_question') {
      this.timer.setMode(this.settings.countdownSeconds || 30, true);
    } else {
      // 不限時 (正向計時)
      this.timer.setMode(0, false);
      this.timer.start();
    }

    if (this.elQuizBankBadge) {
      this.elQuizBankBadge.textContent = bankName;
    }

    this.switchView('quiz');
    this.loadQuestion(0);
  }

  // ================= 聽寫作答階段 (Quiz) =================
  loadQuestion(index) {
    if (index < 0 || index >= this.activeExam.questions.length) return;
    this.activeExam.currentIndex = index;
    const q = this.activeExam.questions[index];
    const total = this.activeExam.questions.length;

    // 更新進度與按鈕文字
    if (this.elQuizProgress) {
      this.elQuizProgress.textContent = `第 ${index + 1} 題 / 共 ${total} 題`;
    }

    if (this.btnQuizPrev) {
      this.btnQuizPrev.disabled = (index === 0);
    }

    if (this.btnQuizNext) {
      this.btnQuizNext.textContent = (index === total - 1) ? '檢查交卷 📋' : '下一題 ➔';
    }

    // 檢查是否為修改模式
    if (this.activeExam.isEditingFromReview) {
      this.elEditingBanner?.classList.add('visible');
      if (this.elEditingQNum) this.elEditingQNum.textContent = index + 1;
    } else {
      this.elEditingBanner?.classList.remove('visible');
    }

    // 更新題目導航滑動列
    this.renderPillStrip();

    // 構建手寫田字格
    this.elGridContainer.innerHTML = '';
    this.currentCanvases = [];

    q.chars.forEach((char, charIdx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tian-cell-wrapper';

      const box = document.createElement('div');
      box.className = 'tian-canvas-box';

      const canvasEl = document.createElement('canvas');
      canvasEl.className = 'handwriting-canvas';

      box.appendChild(canvasEl);
      wrapper.appendChild(box);

      if (q.chars.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'cell-index-badge';
        badge.textContent = `第 ${charIdx + 1} 字`;
        wrapper.appendChild(badge);
      }

      this.elGridContainer.appendChild(wrapper);

      // 實例化田字格
      const tianCanvas = new TianZiGeCanvas(canvasEl, {
        gridType: this.settings.gridType,
        penOnly: !!this.settings.penOnly,
        onStrokeEnd: () => {
          q.hasWritten = true;
          this.updateCurrentPillStatus();
        }
      });

      // 若該字先前已有暫存筆劃，完整復原！
      if (q.strokes && q.strokes[charIdx]) {
        tianCanvas.setStrokes(q.strokes[charIdx]);
      }

      this.currentCanvases.push(tianCanvas);
    });

    // 尺寸校正
    setTimeout(() => {
      this.currentCanvases.forEach(c => {
        c.initCanvasSize();
        c.render();
      });
    }, 40);

    // 單題倒數計時器重置
    if (this.settings.timerMode === 'per_question') {
      this.timer.reset();
      this.timer.start();
    }
  }

  saveCurrentQuestionHandwriting() {
    const q = this.activeExam.questions[this.activeExam.currentIndex];
    if (!q) return;

    // 提取筆劃
    q.strokes = this.currentCanvases.map(c => c.getStrokes());
    q.hasWritten = this.currentCanvases.some(c => c.hasContent());

    // 產生合併縮圖以供總覽與評分展示
    q.snapshot = this.generateCompositeSnapshot();
  }

  generateCompositeSnapshot() {
    if (!this.currentCanvases || this.currentCanvases.length === 0) return null;
    if (this.currentCanvases.length === 1) {
      return this.currentCanvases[0].toDataURL();
    }

    try {
      const offCanvas = document.createElement('canvas');
      const offCtx = offCanvas.getContext('2d');
      const firstCanvas = this.currentCanvases[0].canvas;
      const w = firstCanvas.width;
      const h = firstCanvas.height;
      const gap = 14;

      offCanvas.width = (w * this.currentCanvases.length) + (gap * (this.currentCanvases.length - 1));
      offCanvas.height = h;

      this.currentCanvases.forEach((c, idx) => {
        offCtx.drawImage(c.canvas, idx * (w + gap), 0);
      });

      return offCanvas.toDataURL('image/png');
    } catch (e) {
      return this.currentCanvases[0].toDataURL();
    }
  }

  renderPillStrip() {
    if (!this.elPillStrip) return;
    this.elPillStrip.innerHTML = '';

    this.activeExam.questions.forEach((q, idx) => {
      const pill = document.createElement('div');
      pill.className = `exam-pill ${idx === this.activeExam.currentIndex ? 'active' : ''} ${q.hasWritten ? 'written' : ''}`;
      pill.textContent = idx + 1;

      pill.addEventListener('click', () => {
        sound.playTap();
        this.saveCurrentQuestionHandwriting();
        this.loadQuestion(idx);
      });

      this.elPillStrip.appendChild(pill);
    });

    // 自動捲動至當前題號
    const activePill = this.elPillStrip.children[this.activeExam.currentIndex];
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  updateCurrentPillStatus() {
    if (!this.elPillStrip) return;
    const activePill = this.elPillStrip.children[this.activeExam.currentIndex];
    if (activePill) {
      activePill.classList.add('written');
    }
  }

  handlePlayVoice() {
    const q = this.activeExam.questions[this.activeExam.currentIndex];
    if (!q) return;

    this.btnPlayVoice?.classList.add('speaking');
    speech.speak(
      q.word,
      () => this.btnPlayVoice?.classList.add('speaking'),
      () => this.btnPlayVoice?.classList.remove('speaking')
    );
  }

  handleNextQuestion() {
    this.saveCurrentQuestionHandwriting();

    if (this.activeExam.currentIndex < this.activeExam.questions.length - 1) {
      this.loadQuestion(this.activeExam.currentIndex + 1);
    } else {
      // 最後一題點擊 -> 進入交卷總覽
      this.handleEnterReview();
    }
  }

  // ================= 流程 1 & 2: 交卷前總覽與個別修改 =================
  handleEnterReview() {
    this.saveCurrentQuestionHandwriting();
    this.activeExam.isEditingFromReview = false;
    this.switchView('review');

    const total = this.activeExam.questions.length;
    const writtenCount = this.activeExam.questions.filter(q => q.hasWritten).length;
    const unwrittenCount = total - writtenCount;

    if (this.elReviewStatBadge) {
      this.elReviewStatBadge.textContent = `已完成：${writtenCount} / ${total} 題`;
      if (unwrittenCount > 0) {
        this.elReviewStatBadge.style.borderColor = '#fdba74';
        this.elReviewStatBadge.style.color = '#c2410c';
      } else {
        this.elReviewStatBadge.style.borderColor = '#86efac';
        this.elReviewStatBadge.style.color = '#166534';
      }
    }

    if (this.elReviewGrid) {
      this.elReviewGrid.innerHTML = '';

      this.activeExam.questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = `review-card ${q.hasWritten ? '' : 'unwritten'}`;

        card.innerHTML = `
          <div class="review-card-top">
            <span class="review-card-idx">第 ${idx + 1} 題</span>
            <span class="review-status-pill ${q.hasWritten ? 'written' : 'unwritten'}">
              ${q.hasWritten ? '✅ 已書寫' : '⚠️ 未書寫'}
            </span>
          </div>
          <div class="review-canvas-container">
            ${q.snapshot 
              ? `<img src="${q.snapshot}" class="review-canvas-img" alt="第${idx + 1}題手寫字跡">` 
              : '<span class="review-empty-text">未書寫筆跡</span>'}
          </div>
          <button class="btn-card-modify" data-index="${idx}">
            <span>✏️ 修改此題</span>
          </button>
        `;

        const btnModify = card.querySelector('.btn-card-modify');
        btnModify.addEventListener('click', () => {
          sound.playTap();
          this.activeExam.isEditingFromReview = true;
          this.switchView('quiz');
          this.loadQuestion(idx);
        });

        this.elReviewGrid.appendChild(card);
      });
    }
  }

  // ================= 流程 3: 確定交卷後批改評分 =================
  handleConfirmSubmit() {
    const unwrittenCount = this.activeExam.questions.filter(q => !q.hasWritten).length;
    if (unwrittenCount > 0) {
      if (!confirm(`尚有 ${unwrittenCount} 題未書寫筆跡，確定要交卷評分嗎？`)) {
        return;
      }
    }

    // 停止計時
    this.timer.stop();
    this.activeExam.totalTimeSec = Math.max(1, Math.round((Date.now() - this.activeExam.startTime) / 1000));

    this.showGradingScreen();
  }

  showGradingScreen() {
    this.switchView('grading');
    this.updateGradingScoreBanner();

    if (this.elGradingList) {
      this.elGradingList.innerHTML = '';

      this.activeExam.questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = `grading-card ${q.isCorrect ? 'is-correct' : 'is-wrong'}`;

        card.innerHTML = `
          <div class="grading-card-top">
            <span class="grading-card-idx">第 ${idx + 1} 題</span>
            <button class="tool-btn btn-pronounce" style="padding: 4px 10px; font-size: 0.85rem;" data-word="${q.word}">
              <span>🔊 聽發音</span>
            </button>
          </div>
          <div class="grading-content-row">
            <!-- 標準答案 (楷體國字) -->
            <div class="grading-box">
              <span class="grading-box-label">標準楷體國字</span>
              <span class="grading-standard-word font-kai">${q.word}</span>
            </div>
            <!-- 學生手寫字跡 -->
            <div class="grading-box">
              <span class="grading-box-label">學生手寫筆跡</span>
              ${q.snapshot 
                ? `<img src="${q.snapshot}" class="grading-handwriting-img" alt="手寫筆劃">`
                : '<span style="color: #94a3b8; font-weight: 600;">未作答</span>'}
            </div>
          </div>
          <div class="grading-actions-row">
            <button class="btn-grade-opt correct ${q.isCorrect ? 'active' : ''}" data-index="${idx}">
              <span>✔ 正確</span>
            </button>
            <button class="btn-grade-opt wrong ${!q.isCorrect ? 'active' : ''}" data-index="${idx}">
              <span>✖ 打叉</span>
            </button>
          </div>
        `;

        // 發音按鈕
        const btnVoice = card.querySelector('.btn-pronounce');
        btnVoice.addEventListener('click', () => {
          speech.speak(q.word);
        });

        // 評分按鈕 (打勾 / 打叉)
        const btnCorrect = card.querySelector('.btn-grade-opt.correct');
        const btnWrong = card.querySelector('.btn-grade-opt.wrong');

        btnCorrect.addEventListener('click', () => {
          sound.playCorrect();
          q.isCorrect = true;
          btnCorrect.classList.add('active');
          btnWrong.classList.remove('active');
          card.classList.add('is-correct');
          card.classList.remove('is-wrong');
          this.updateGradingScoreBanner();
        });

        btnWrong.addEventListener('click', () => {
          sound.playWrong();
          q.isCorrect = false;
          btnWrong.classList.add('active');
          btnCorrect.classList.remove('active');
          card.classList.add('is-wrong');
          card.classList.remove('is-correct');
          this.updateGradingScoreBanner();
        });

        this.elGradingList.appendChild(card);
      });
    }
  }

  updateGradingScoreBanner() {
    const total = this.activeExam.questions.length;
    const correctCount = this.activeExam.questions.filter(q => q.isCorrect).length;
    const wrongCount = total - correctCount;
    const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    if (this.elGradingLiveScore) {
      this.elGradingLiveScore.textContent = `目前得分: ${scorePct} 分`;
    }
    if (this.elGradeCorrectCount) {
      this.elGradeCorrectCount.textContent = `✔ 正確: ${correctCount} 題`;
    }
    if (this.elGradeWrongCount) {
      this.elGradeWrongCount.textContent = `✖ 打叉: ${wrongCount} 題`;
    }
  }

  // ================= 流程 4: 評分完成並記錄打叉錯題 =================
  finishGradingAndSave() {
    const total = this.activeExam.questions.length;
    const correctCount = this.activeExam.questions.filter(q => q.isCorrect).length;
    const wrongQuestions = this.activeExam.questions.filter(q => !q.isCorrect);
    const wrongWords = wrongQuestions.map(q => q.word);
    const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // 持久化保存至 LocalStorage (依指示：不存筆跡圖片，只記錄該題文字與對錯狀態！)
    recordsManager.addRecord({
      bankName: this.activeExam.bankName,
      totalCount: total,
      correctCount: correctCount,
      wrongCount: wrongWords.length,
      score: scorePct,
      wrongWords: wrongWords,
      items: this.activeExam.questions.map(q => ({
        word: q.word,
        isCorrect: q.isCorrect
      }))
    });

    this.showResultScreen(scorePct, correctCount, total, wrongWords);
  }

  showResultScreen(scorePct, correctCount, total, wrongWords) {
    this.switchView('result');

    if (scorePct === 100) {
      sound.playFanfare();
    } else if (scorePct >= 80) {
      sound.playSuccess();
    } else {
      sound.playCorrect();
    }

    if (this.elResultScoreNum) this.elResultScoreNum.textContent = `${scorePct} 分`;
    if (this.elResultTotalCount) this.elResultTotalCount.textContent = `共 ${total} 題`;
    if (this.elResultCorrectCount) this.elResultCorrectCount.textContent = `答對 ${correctCount} 題`;
    if (this.elResultWrongCount) this.elResultWrongCount.textContent = `打叉 ${wrongWords.length} 題`;
    if (this.elResultTimeSpent) this.elResultTimeSpent.textContent = `用時 ${this.activeExam.totalTimeSec} 秒`;

    if (this.elResultScorePraise) {
      if (scorePct === 100) {
        this.elResultScorePraise.textContent = '🌟 太厲害了！滿分全對，字跡工整無懈可擊！';
      } else if (scorePct >= 80) {
        this.elResultScorePraise.textContent = '👏 表現優異！把打叉的生字多看一眼就更棒了！';
      } else {
        this.elResultScorePraise.textContent = '💪 繼續加油！多練習幾次一定會越來越熟練！';
      }
    }

    // 錯題文字呈現
    if (this.elWrongWordsContainer) {
      this.elWrongWordsContainer.innerHTML = '';

      if (wrongWords.length === 0) {
        this.elWrongWordsContainer.innerHTML = `
          <div class="no-wrong-box">
            🎉 恭喜！本次測驗全對，完全沒有打叉的錯字！
          </div>
        `;
        if (this.btnRetestWrongWords) this.btnRetestWrongWords.style.display = 'none';
      } else {
        const grid = document.createElement('div');
        grid.className = 'wrong-words-grid';

        wrongWords.forEach(w => {
          const chip = document.createElement('span');
          chip.className = 'wrong-word-chip font-kai';
          chip.textContent = `❌ ${w}`;
          grid.appendChild(chip);
        });

        this.elWrongWordsContainer.appendChild(grid);

        if (this.btnRetestWrongWords) {
          this.btnRetestWrongWords.style.display = 'inline-flex';
          this.btnRetestWrongWords.textContent = `🎯 立即測驗本次錯題 (共 ${wrongWords.length} 題)`;
        }
      }
    }
  }

  retestWrongWords(customList = null) {
    const wrongWords = customList || this.activeExam.questions.filter(q => !q.isCorrect).map(q => q.word);
    if (wrongWords.length === 0) {
      alert('沒有錯題需要重測！');
      return;
    }

    this.startNewExam(wrongWords, `錯題專項測驗 (${wrongWords.length}題)`);
  }

  // ================= 歷次紀錄與錯題本 =================
  showRecordsScreen() {
    this.switchView('records');
    const stats = recordsManager.getOverallStats();

    if (this.elStatTotalTests) this.elStatTotalTests.textContent = stats.totalTests;
    if (this.elStatAvgScore) this.elStatAvgScore.textContent = `${stats.avgScore} 分`;
    if (this.elStatTotalWrong) this.elStatTotalWrong.textContent = `${stats.totalWrongCount} 題`;

    // 高頻易錯字排行榜
    if (this.elRankingWrap) {
      this.elRankingWrap.innerHTML = '';
      const topWrongs = recordsManager.getTopWrongWords(12);

      if (topWrongs.length === 0) {
        this.elRankingWrap.innerHTML = '<span style="color: #94a3b8; font-weight: 600;">尚無錯題紀錄，繼續保持！</span>';
      } else {
        topWrongs.forEach(item => {
          const pill = document.createElement('div');
          pill.className = 'ranking-pill';
          pill.innerHTML = `
            <span class="font-kai">${item.word}</span>
            <span class="ranking-count-tag">${item.count}次</span>
          `;
          this.elRankingWrap.appendChild(pill);
        });
      }
    }

    // 歷次詳細測驗清單
    if (this.elHistoryList) {
      this.elHistoryList.innerHTML = '';
      const records = recordsManager.getRecords();

      if (records.length === 0) {
        this.elHistoryList.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #94a3b8; font-weight: 600;">
            目前尚無歷次測驗紀錄，點擊「聽寫測驗」開始第一回測驗吧！
          </div>
        `;
        return;
      }

      records.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'history-record-card';

        let badgeClass = 'good';
        if (rec.score === 100) badgeClass = 'perfect';
        if (rec.score < 80) badgeClass = 'warn';

        const wrongPillsHtml = (rec.wrongWords && rec.wrongWords.length > 0)
          ? rec.wrongWords.map(w => `<span class="record-wrong-pill font-kai">❌ ${w}</span>`).join('')
          : '<span style="color: #16a34a; font-weight: 700; font-size: 0.95rem;">💯 全對無打叉</span>';

        card.innerHTML = `
          <div class="record-top-row">
            <div>
              <span class="record-date">${rec.dateStr}</span>
              <span class="record-bank" style="margin-left: 8px;">${rec.bankName}</span>
            </div>
            <span class="record-score-badge ${badgeClass}">${rec.score} 分 (${rec.correctCount}/${rec.totalCount})</span>
          </div>
          <div class="record-wrong-words-box">
            <span class="record-wrong-label">錯題紀錄：</span>
            ${wrongPillsHtml}
          </div>
          <div class="record-actions-row">
            ${(rec.wrongWords && rec.wrongWords.length > 0) 
              ? `<button class="tool-btn btn-retest-rec" style="font-size: 0.85rem; padding: 5px 12px; color: var(--primary);">
                   <span>🎯 重練這筆錯題</span>
                 </button>` 
              : ''}
            <button class="tool-btn danger btn-delete-rec" style="font-size: 0.85rem; padding: 5px 12px;">
              <span>🗑️ 刪除紀錄</span>
            </button>
          </div>
        `;

        const btnDel = card.querySelector('.btn-delete-rec');
        btnDel.addEventListener('click', () => {
          if (confirm('確定要刪除這筆紀錄嗎？')) {
            sound.playTap();
            recordsManager.deleteRecord(rec.id);
            this.showRecordsScreen();
          }
        });

        const btnRetest = card.querySelector('.btn-retest-rec');
        if (btnRetest) {
          btnRetest.addEventListener('click', () => {
            sound.playTap();
            this.retestWrongWords(rec.wrongWords);
          });
        }

        this.elHistoryList.appendChild(card);
      });
    }
  }

  // ================= 題庫管理 (Banks) =================
  showBanksScreen() {
    this.switchView('banks');
    this.renderBankList();
  }

  renderBankList() {
    if (!this.elBankListContainer) return;
    this.elBankListContainer.innerHTML = '';

    const banks = bankManager.getBanks();
    const activeBank = bankManager.getActiveBank();

    banks.forEach(bank => {
      const card = document.createElement('div');
      card.className = `bank-card ${activeBank && activeBank.id === bank.id ? 'active' : ''}`;

      card.innerHTML = `
        <div>
          <div class="bank-title-row">
            <span class="bank-name">${bank.name}</span>
            <span class="bank-badge">${bank.words.length} 題</span>
          </div>
          <p class="bank-words-preview font-kai" style="margin-top: 10px;">${bank.words.join('、')}</p>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;">
          <button class="tool-btn btn-edit-bank">編輯</button>
          <button class="tool-btn danger btn-del-bank">刪除</button>
          <button class="tool-btn primary btn-select-bank">${activeBank && activeBank.id === bank.id ? '目前使用' : '選用'}</button>
        </div>
      `;

      card.querySelector('.btn-select-bank').addEventListener('click', () => {
        sound.playTap();
        bankManager.setActiveBank(bank.id);
        this.renderBankList();
      });

      card.querySelector('.btn-edit-bank').addEventListener('click', () => {
        sound.playTap();
        this.handleEditBankModal(bank);
      });

      card.querySelector('.btn-del-bank').addEventListener('click', () => {
        sound.playTap();
        if (confirm(`確定要刪除題庫「${bank.name}」嗎？`)) {
          bankManager.deleteBank(bank.id);
          this.renderBankList();
        }
      });

      this.elBankListContainer.appendChild(card);
    });
  }

  handleNewBankModal() {
    const name = prompt('請輸入新題庫名稱：', '自訂生字題庫');
    if (!name) return;

    const rawWords = prompt('請輸入生字或詞語（每個詞語以空格、逗號或換行隔開）：\n例如：學校 老師 同學 讀書');
    if (!rawWords) return;

    const newBank = bankManager.addBank(name, rawWords);
    if (newBank) {
      alert(`已成功建立「${newBank.name}」，共 ${newBank.words.length} 題！`);
      this.renderBankList();
    } else {
      alert('建立失敗，生字內容不可為空！');
    }
  }

  handleEditBankModal(bank) {
    const name = prompt('修改題庫名稱：', bank.name);
    if (!name) return;

    const rawWords = prompt('修改詞語（以空格、逗號或換行隔開）：', bank.words.join(' '));
    if (!rawWords) return;

    if (bankManager.updateBank(bank.id, name, rawWords)) {
      alert('題庫更新成功！');
      this.renderBankList();
    }
  }

  handleImportBanks(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (bankManager.importJSON(event.target.result)) {
        alert('題庫匯入成功！');
        this.renderBankList();
      } else {
        alert('匯入失敗，請確認檔案格式是否為合法的 JSON 題庫檔案。');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }
}

// 實例化啟動
window.addEventListener('DOMContentLoaded', () => {
  window.examApp = new ExamAppController();
});

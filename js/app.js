/**
 * 國語生字聽寫 App 主應用控制器
 */
import { TianZiGeCanvas } from './canvas.js';
import { speech } from './speech.js';
import { QuizTimer } from './timer.js';
import { bankManager } from './bank.js';
import { sound } from './sound.js';

// 全域設定 Key
const STORAGE_KEY_SETTINGS = 'gifted_s_settings';

class AppController {
  constructor() {
    this.settings = {
      countdownSeconds: 30,
      gridType: 'tian',        // 'tian' 或 'mi'
      gridSize: 'comfortable', // 'compact' (76px/2cm), 'comfortable' (150px), 'large' (200px)
      allowReplay: true,       // 倒數期間是否允許再次點擊播放重聽
      randomOrder: true,       // 是否隨機抽題
      speechRate: 0.85         // 語音語速
    };

    this.timer = new QuizTimer(this.settings.countdownSeconds);
    this.currentCanvases = [];
    this.quizQuestions = [];
    this.currentIndex = 0;
    this.quizResults = []; // 儲存作答成果截圖與比對資訊
    this.hasPlayedCurrentAudio = false;

    this.loadSettings();
    this.initDOM();
    this.bindEvents();
    this.initTimerCallbacks();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
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
    // 套用格線大小到 CSS 變數
    let sizePx = '150px';
    if (this.settings.gridSize === 'compact') sizePx = '80px';
    if (this.settings.gridSize === 'large') sizePx = '200px';
    document.documentElement.style.setProperty('--grid-size', sizePx);

    // 套用計時秒數
    this.timer.setDuration(this.settings.countdownSeconds);

    // 套用語速
    speech.setRate(this.settings.speechRate);

    // 同步更新設定面板上的控制項數值
    const inputTimer = document.getElementById('setting-timer');
    const selectGridSize = document.getElementById('setting-grid-size');
    const selectGridType = document.getElementById('setting-grid-type');
    const checkReplay = document.getElementById('setting-replay');
    const checkRandom = document.getElementById('setting-random');
    const selectRate = document.getElementById('setting-speech-rate');

    if (inputTimer && document.activeElement !== inputTimer) {
      inputTimer.value = this.settings.countdownSeconds;
    }
    if (selectGridSize) selectGridSize.value = this.settings.gridSize;
    if (selectGridType) selectGridType.value = this.settings.gridType;
    if (checkReplay) checkReplay.checked = this.settings.allowReplay;
    if (checkRandom) checkRandom.checked = this.settings.randomOrder;
    if (selectRate) selectRate.value = this.settings.speechRate;
  }

  initDOM() {
    // 導覽標籤與畫面
    this.navBtns = document.querySelectorAll('.nav-btn');
    this.views = {
      quiz: document.getElementById('view-quiz'),
      banks: document.getElementById('view-banks'),
      result: document.getElementById('view-result'),
      settings: document.getElementById('view-settings')
    };

    // 測驗元素
    this.elProgressCount = document.getElementById('quiz-progress-count');
    this.elBankBadgeName = document.getElementById('quiz-bank-name');
    this.elTimerBadge = document.getElementById('timer-badge');
    this.elTimerBar = document.getElementById('timer-bar-inner');
    this.elLockOverlay = document.getElementById('stage-lock-overlay');
    this.elGridContainer = document.getElementById('tian-grid-container');

    this.btnPlayAudio = document.getElementById('btn-play-audio');
    this.btnNextQuestion = document.getElementById('btn-next-question');
    this.btnClearCanvas = document.getElementById('btn-clear-canvas');
    this.btnUndoStroke = document.getElementById('btn-undo-stroke');

    // 題庫管理元素
    this.elBankListContainer = document.getElementById('bank-list-container');
    this.btnNewBank = document.getElementById('btn-new-bank');
    this.btnExportBanks = document.getElementById('btn-export-banks');
    this.fileImportInput = document.getElementById('file-import-input');
  }

  bindEvents() {
    // 導覽切換
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.dataset.view;
        this.switchView(targetView);
      });
    });

    // 播放音檔與倒數
    this.btnPlayAudio.addEventListener('click', () => this.handlePlayAudio());

    // 下一題
    this.btnNextQuestion.addEventListener('click', () => this.handleNextQuestion());

    // 清除畫布
    this.btnClearCanvas.addEventListener('click', () => {
      this.currentCanvases.forEach(c => c.clear());
    });

    // 復原上一筆
    this.btnUndoStroke.addEventListener('click', () => {
      // 復原最後一個有筆劃的畫布
      for (let i = this.currentCanvases.length - 1; i >= 0; i--) {
        if (this.currentCanvases[i].hasContent()) {
          this.currentCanvases[i].undo();
          break;
        }
      }
    });

    // 題庫管理按鈕
    this.btnNewBank.addEventListener('click', () => this.showBankEditorModal());
    this.btnExportBanks.addEventListener('click', () => bankManager.exportToJSON());
    this.fileImportInput.addEventListener('change', (e) => this.handleImportFile(e));

    // 設定表單事件綁定
    this.bindSettingsEvents();

    // 視窗大小改變或平板旋轉時自動更新畫布尺寸
    window.addEventListener('resize', () => {
      this.currentCanvases.forEach(c => {
        c.initCanvasSize();
        c.render();
      });
    });

    // 初始載入題庫清單並開始準備測驗
    this.renderBankList();
    this.startQuiz();
  }

  initTimerCallbacks() {
    this.timer.onTick = (remaining, total, percent) => {
      this.elTimerBadge.textContent = `${remaining}s`;
      this.elTimerBar.style.width = `${percent}%`;

      if (remaining <= 5) {
        this.elTimerBadge.classList.add('warning');
        this.elTimerBar.classList.add('warning');
      } else {
        this.elTimerBadge.classList.remove('warning');
        this.elTimerBar.classList.remove('warning');
      }
    };

    this.timer.onExpire = () => {
      this.elTimerBadge.classList.remove('warning');
      this.elTimerBadge.classList.add('locked');
      this.elLockOverlay.classList.add('visible');

      // 鎖定所有田字格畫布
      this.currentCanvases.forEach(c => c.setLocked(true));
      this.btnClearCanvas.disabled = true;
      this.btnUndoStroke.disabled = true;

      // 如果不允許時間到後重播，停用播放按鈕
      if (!this.settings.allowReplay) {
        this.btnPlayAudio.disabled = true;
      }
    };
  }

  switchView(viewName) {
    // 停止正在進行的計時與發音
    speech.stop();

    Object.keys(this.views).forEach(key => {
      if (this.views[key]) {
        this.views[key].classList.toggle('active', key === viewName);
      }
    });

    this.navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    if (viewName === 'banks') {
      this.renderBankList();
    }
    if (viewName === 'settings') {
      this.applySettingsToUI();
    }
  }

  /**
   * 開始新測驗 (抽取 20 題或全出)
   */
  startQuiz() {
    const bank = bankManager.getActiveBank();
    if (!bank || !bank.words || bank.words.length === 0) {
      alert('目前選擇的題庫沒有詞語，請先前往「題庫管理」新增詞語！');
      this.switchView('banks');
      return;
    }

    // 抽題邏輯：若超過 20 題，隨機或順序取 20 題；小於等於 20 題則全出
    let words = [...bank.words];
    if (this.settings.randomOrder) {
      // Fisher-Yates 洗牌演算法
      for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
      }
    }

    if (words.length > 20) {
      words = words.slice(0, 20);
    }

    this.quizQuestions = words;
    this.currentIndex = 0;
    this.quizResults = [];

    this.elBankBadgeName.textContent = bank.name;
    this.switchView('quiz');
    this.renderQuestion(this.currentIndex);
  }

  /**
   * 渲染第 N 題
   */
  renderQuestion(index) {
    this.currentIndex = index;
    const word = this.quizQuestions[index];
    const total = this.quizQuestions.length;

    // 更新進度顯示
    this.elProgressCount.textContent = `${index + 1} / ${total}`;
    this.btnNextQuestion.textContent = (index === total - 1) ? '完成測驗' : '下一題';

    // 重置狀態
    this.hasPlayedCurrentAudio = false;
    this.timer.reset();
    this.elTimerBadge.classList.remove('warning', 'locked');
    this.elTimerBar.classList.remove('warning');
    this.elLockOverlay.classList.remove('visible');
    this.btnClearCanvas.disabled = false;
    this.btnUndoStroke.disabled = false;
    this.btnPlayAudio.disabled = false;
    this.btnPlayAudio.classList.remove('speaking');

    // 清空並動態建立田字格畫布 (依據該詞語的字數)
    this.elGridContainer.innerHTML = '';
    this.currentCanvases = [];

    const chars = word.split('');
    chars.forEach((char, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'tian-cell-wrapper';

      const canvasBox = document.createElement('div');
      canvasBox.className = 'tian-canvas-box';

      const canvasEl = document.createElement('canvas');
      canvasEl.className = 'handwriting-canvas';

      canvasBox.appendChild(canvasEl);
      wrapper.appendChild(canvasBox);

      // 若為多字詞，標示第幾個字
      if (chars.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'cell-index-badge';
        badge.textContent = `第 ${idx + 1} 字`;
        wrapper.appendChild(badge);
      }

      this.elGridContainer.appendChild(wrapper);

      // 實例化田字格手寫板
      const tianCanvas = new TianZiGeCanvas(canvasEl, {
        gridType: this.settings.gridType,
        onStrokeEnd: () => {
          // 書寫中若計時器尚未啟動，提示可先點播放
        }
      });

      this.currentCanvases.push(tianCanvas);
    });

    // 延遲一點點自動觸發繪製調整以適配正確尺寸
    setTimeout(() => {
      this.currentCanvases.forEach(c => {
        c.initCanvasSize();
        c.render();
      });
    }, 50);
  }

  /**
   * 點擊播放發音 (同時啟動 30 秒倒數)
   */
  handlePlayAudio() {
    const word = this.quizQuestions[this.currentIndex];
    if (!word) return;

    // 若設定不允許倒數中重播且已經在計時中
    if (!this.settings.allowReplay && this.timer.isRunning) {
      return;
    }

    this.btnPlayAudio.classList.add('speaking');

    // 啟動朗讀
    speech.speak(word, 
      () => {
        // 發音開始
        this.btnPlayAudio.classList.add('speaking');
      },
      () => {
        // 發音結束
        this.btnPlayAudio.classList.remove('speaking');
      }
    );

    // 第一次點擊播放時啟動倒數計時器
    if (!this.hasPlayedCurrentAudio) {
      this.hasPlayedCurrentAudio = true;
      this.timer.start();
    }
  }

  /**
   * 下一題或完成測驗
   */
  handleNextQuestion() {
    const word = this.quizQuestions[this.currentIndex];
    
    // 擷取目前所有字的手寫截圖
    const charImages = this.currentCanvases.map(c => c.toDataURL());

    this.quizResults.push({
      questionIndex: this.currentIndex,
      standardWord: word,
      charImages: charImages,
      isCorrect: true // 預設為正確，供結算頁檢視時打勾/打叉
    });

    this.timer.stop();

    if (this.currentIndex < this.quizQuestions.length - 1) {
      this.renderQuestion(this.currentIndex + 1);
    } else {
      // 測驗結束，進入成果與對答案畫面
      this.showQuizResult();
    }
  }

  /**
   * 顯示測驗結算畫面 (標準國字 vs 手寫筆劃對照)
   */
  showQuizResult() {
    sound.playSuccess();
    this.switchView('result');

    const totalQuestions = this.quizResults.length;
    const elScoreNum = document.getElementById('result-score-num');
    const elScoreTotal = document.getElementById('result-score-total');
    const elReviewList = document.getElementById('review-list-container');

    elScoreTotal.textContent = `/ ${totalQuestions * 5} 分`; // 每題5分

    const updateScore = () => {
      const correctCount = this.quizResults.filter(r => r.isCorrect).length;
      elScoreNum.textContent = correctCount * 5;
    };

    updateScore();
    elReviewList.innerHTML = '';

    this.quizResults.forEach((item, qIdx) => {
      const card = document.createElement('div');
      card.className = `review-item-card ${item.isCorrect ? 'correct' : 'wrong'}`;

      // 標準字 (楷體大字)
      const wordBox = document.createElement('div');
      wordBox.className = 'review-standard-word font-kai';
      wordBox.textContent = item.standardWord;

      // 手寫畫布縮圖
      const previewBox = document.createElement('div');
      previewBox.className = 'review-handwriting-preview';

      item.charImages.forEach(imgUrl => {
        const img = document.createElement('img');
        img.className = 'review-thumb';
        img.src = imgUrl;
        img.alt = '手寫字跡';
        previewBox.appendChild(img);
      });

      // 打勾 / 打叉評分按鈕
      const btnGroup = document.createElement('div');
      btnGroup.className = 'check-btn-group';

      const btnPass = document.createElement('button');
      btnPass.className = `check-btn btn-pass ${item.isCorrect ? 'selected' : ''}`;
      btnPass.innerHTML = '✓';
      btnPass.title = '批改為正確';

      const btnFail = document.createElement('button');
      btnFail.className = `check-btn btn-fail ${!item.isCorrect ? 'selected' : ''}`;
      btnFail.innerHTML = '✗';
      btnFail.title = '批改為錯誤';

      btnPass.onclick = () => {
        item.isCorrect = true;
        card.className = 'review-item-card correct';
        btnPass.classList.add('selected');
        btnFail.classList.remove('selected');
        updateScore();
      };

      btnFail.onclick = () => {
        item.isCorrect = false;
        card.className = 'review-item-card wrong';
        btnFail.classList.add('selected');
        btnPass.classList.remove('selected');
        updateScore();
      };

      btnGroup.appendChild(btnPass);
      btnGroup.appendChild(btnFail);

      card.appendChild(wordBox);
      card.appendChild(previewBox);
      card.appendChild(btnGroup);

      elReviewList.appendChild(card);
    });

    // 重新測驗按鈕
    document.getElementById('btn-retest').onclick = () => {
      this.startQuiz();
    };
  }

  /**
   * 渲染題庫管理列表
   */
  renderBankList() {
    const banks = bankManager.getAllBanks();
    const activeBank = bankManager.getActiveBank();
    this.elBankListContainer.innerHTML = '';

    banks.forEach(bank => {
      const isSelected = activeBank && activeBank.id === bank.id;
      const card = document.createElement('div');
      card.className = `bank-card ${isSelected ? 'selected' : ''}`;

      const header = document.createElement('div');
      header.className = 'bank-card-header';

      const title = document.createElement('div');
      title.className = 'bank-name';
      title.textContent = bank.name;

      const badge = document.createElement('span');
      badge.className = 'bank-badge';
      badge.textContent = `${bank.words.length} 題`;

      header.appendChild(title);
      header.appendChild(badge);

      const preview = document.createElement('div');
      preview.className = 'bank-preview';
      preview.textContent = bank.words.slice(0, 10).join('、') + (bank.words.length > 10 ? '...' : '');

      const actions = document.createElement('div');
      actions.className = 'bank-actions';

      const btnSelect = document.createElement('button');
      btnSelect.className = 'tool-btn';
      btnSelect.textContent = isSelected ? '目前選擇' : '選擇此題庫';
      if (isSelected) btnSelect.style.borderColor = 'var(--primary)';
      btnSelect.onclick = (e) => {
        e.stopPropagation();
        bankManager.setActiveBank(bank.id);
        this.renderBankList();
        this.startQuiz();
      };

      const btnEdit = document.createElement('button');
      btnEdit.className = 'tool-btn';
      btnEdit.textContent = '編輯';
      btnEdit.onclick = (e) => {
        e.stopPropagation();
        this.showBankEditorModal(bank);
      };

      const btnDelete = document.createElement('button');
      btnDelete.className = 'tool-btn danger';
      btnDelete.textContent = '刪除';
      btnDelete.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除「${bank.name}」嗎？`)) {
          bankManager.deleteBank(bank.id);
          this.renderBankList();
        }
      };

      actions.appendChild(btnSelect);
      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);

      card.appendChild(header);
      card.appendChild(preview);
      card.appendChild(actions);

      card.onclick = () => {
        bankManager.setActiveBank(bank.id);
        this.renderBankList();
      };

      this.elBankListContainer.appendChild(card);
    });
  }

  /**
   * 彈出題庫編輯 Modal
   */
  showBankEditorModal(bankToEdit = null) {
    const modal = document.getElementById('bank-editor-modal');
    const inputName = document.getElementById('modal-bank-name');
    const textareaWords = document.getElementById('modal-bank-words');
    const btnSave = document.getElementById('btn-modal-save');
    const btnCancel = document.getElementById('btn-modal-cancel');

    if (bankToEdit) {
      inputName.value = bankToEdit.name;
      textareaWords.value = bankToEdit.words.join('\n');
    } else {
      inputName.value = '';
      textareaWords.value = '';
    }

    modal.style.display = 'flex';

    btnCancel.onclick = () => {
      modal.style.display = 'none';
    };

    btnSave.onclick = () => {
      const name = inputName.value.trim() || '未命名題庫';
      const words = textareaWords.value;

      if (bankToEdit) {
        bankManager.updateBank(bankToEdit.id, name, words);
      } else {
        bankManager.createBank(name, words);
      }

      modal.style.display = 'none';
      this.renderBankList();
    };
  }

  /**
   * 匯入 JSON 題庫檔案
   */
  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const success = bankManager.importFromJSON(e.target.result);
      if (success) {
        alert('題庫匯入成功！');
        this.renderBankList();
      } else {
        alert('匯入失敗，請確認檔案格式是否正確。');
      }
      this.fileImportInput.value = '';
    };
    reader.readAsText(file);
  }

  /**
   * 綁定設定面板相關互動 (點擊儲存按鈕保存所有設定)
   */
  bindSettingsEvents() {
    const inputTimer = document.getElementById('setting-timer');
    const selectGridSize = document.getElementById('setting-grid-size');
    const selectGridType = document.getElementById('setting-grid-type');
    const checkReplay = document.getElementById('setting-replay');
    const checkRandom = document.getElementById('setting-random');
    const selectRate = document.getElementById('setting-speech-rate');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const saveMsg = document.getElementById('save-settings-msg');

    // 初始載入設定值至表單
    if (inputTimer) inputTimer.value = this.settings.countdownSeconds;
    if (selectGridSize) selectGridSize.value = this.settings.gridSize;
    if (selectGridType) selectGridType.value = this.settings.gridType;
    if (checkReplay) checkReplay.checked = this.settings.allowReplay;
    if (checkRandom) checkRandom.checked = this.settings.randomOrder;
    if (selectRate) selectRate.value = this.settings.speechRate;

    // 執行儲存的統一函式
    const doSave = () => {
      // 1. 處理倒數時間 (允許輸入自訂數字，限制在 5 ~ 300 秒)
      if (inputTimer) {
        let sec = parseInt(inputTimer.value, 10);
        if (isNaN(sec) || sec < 5) sec = 5;
        if (sec > 300) sec = 300;
        inputTimer.value = sec;
        this.settings.countdownSeconds = sec;
      }

      // 2. 處理其他各項設定
      if (selectGridSize) this.settings.gridSize = selectGridSize.value;
      if (selectGridType) this.settings.gridType = selectGridType.value;
      if (checkReplay) this.settings.allowReplay = checkReplay.checked;
      if (checkRandom) this.settings.randomOrder = checkRandom.checked;
      if (selectRate) this.settings.speechRate = parseFloat(selectRate.value);

      // 3. 寫入 LocalStorage 並套用
      this.saveSettings();

      // 4. 即時更新現有畫布
      this.currentCanvases.forEach(c => {
        c.options.gridType = this.settings.gridType;
        c.initCanvasSize();
        c.render();
      });

      // 5. 提示使用者「設定已儲存」
      if (btnSaveSettings) {
        btnSaveSettings.innerHTML = '<span>✅ 設定已儲存！</span>';
        btnSaveSettings.style.background = 'linear-gradient(135deg, #059669, #10b981)';
      }
      if (saveMsg) {
        saveMsg.style.display = 'flex';
      }

      setTimeout(() => {
        if (btnSaveSettings) {
          btnSaveSettings.innerHTML = '<span>💾 儲存設定</span>';
          btnSaveSettings.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
        }
        if (saveMsg) {
          saveMsg.style.display = 'none';
        }
      }, 2000);
    };

    // 點擊「儲存設定」按鈕
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', doSave);
    }

    // 在倒數秒數輸入框按 Enter 亦可快速儲存
    if (inputTimer) {
      inputTimer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSave();
        }
      });
    }
  }
}

// 確保 DOM 載入時一定能啟動應用
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.app = new AppController();
  });
} else {
  window.app = new AppController();
}

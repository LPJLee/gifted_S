// === 音效模組 ===
/**
 * Web Audio API 原生音效合成模組
 * 100% 離線可用，免載入外部音檔，支援靜音控制
 */
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = !!muted;
  }

  isMuted() {
    return this.muted;
  }

  playTap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(0, now + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.4);
    });
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.22);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  playComplete() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 勝利琶音 C-E-G-C-E-G
    const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.65);
    });
  }

  playTick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }
}

const sound = new SoundEffects();


// === 計時器模組 ===
/**
 * 數學測驗計時器模組 (支援「不限時累積計時」、「全卷總時長倒數」與「單題獨立倒數」)
 */


class QuizTimer {
  constructor(durationSeconds = 0, isCountdown = false) {
    this.duration = durationSeconds;
    this.isCountdown = isCountdown;
    this.remaining = durationSeconds;
    this.elapsed = 0;
    this.intervalId = null;
    this.isRunning = false;

    this.onTick = null;
    this.onTimeout = null;
  }

  setMode(durationSeconds, isCountdown = false) {
    this.duration = durationSeconds;
    this.isCountdown = isCountdown;
    this.reset();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      if (this.isCountdown) {
        this.remaining--;
        this.elapsed++;

        if (this.remaining <= 5 && this.remaining > 0) {
          sound.playTick();
        }

        if (this.onTick) {
          this.onTick(this.remaining, this.duration);
        }

        if (this.remaining <= 0) {
          this.stop();
          sound.playWrong();
          if (this.onTimeout) {
            this.onTimeout();
          }
        }
      } else {
        this.elapsed++;
        if (this.onTick) {
          this.onTick(this.elapsed, 0);
        }
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  reset() {
    this.stop();
    this.remaining = this.duration;
    this.elapsed = 0;
  }

  getElapsedSeconds() {
    return this.elapsed;
  }

  getRemainingSeconds() {
    return this.remaining;
  }

  formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}


// === 題庫管理模組 ===
/**
 * 數學測驗題庫管理模組
 * 內建：
 * 1. 個位數加個位數（可以進位）
 * 2. 兩位數減個位數（兩位數十位數為 1，且必須退位）
 * 3. 兩者混合之綜合測驗
 * 4. 20以內精熟大題庫
 * 同時支援自訂題庫、匯入與匯出！
 */

const STORAGE_KEY_BANKS = 'gifted_s_math_exam_banks';
const STORAGE_KEY_ACTIVE_BANK = 'gifted_s_math_active_bank_id';

// 生成所有 45 題「十幾減個位數且必退位」題目
function generateAllBorrowSubtractionProblems() {
  const list = [];
  let id = 1;
  // 被減數 10 ~ 18 (十位數為 1)
  for (let num1 = 10; num1 <= 18; num1++) {
    const unit1 = num1 % 10;
    // 減數為個位數 1 ~ 9，且必須退位 (unit1 < num2)
    for (let num2 = unit1 + 1; num2 <= 9; num2++) {
      list.push({
        id: 'sub_' + (id++),
        num1: num1,
        op: '-',
        num2: num2,
        answer: num1 - num2,
        isRegroup: true,
        text: `${num1} - ${num2} = ${num1 - num2}`
      });
    }
  }
  return list;
}

// 生成 45 題「個位數加個位數（和在 10~18 之必進位題型）」
function generateCarryAdditionProblems() {
  const list = [];
  let id = 1;
  for (let num1 = 1; num1 <= 9; num1++) {
    for (let num2 = 1; num2 <= 9; num2++) {
      if (num1 + num2 >= 10) {
        list.push({
          id: 'add_c_' + (id++),
          num1: num1,
          op: '+',
          num2: num2,
          answer: num1 + num2,
          isRegroup: true,
          text: `${num1} + ${num2} = ${num1 + num2}`
        });
      }
    }
  }
  return list;
}

// 生成全部 81 題「個位數加個位數（1~9 + 1~9，可進位亦可不進位）」
function generateAllSingleAdditionProblems() {
  const list = [];
  let id = 1;
  for (let num1 = 1; num1 <= 9; num1++) {
    for (let num2 = 1; num2 <= 9; num2++) {
      list.push({
        id: 'add_all_' + (id++),
        num1: num1,
        op: '+',
        num2: num2,
        answer: num1 + num2,
        isRegroup: (num1 + num2 >= 10),
        text: `${num1} + ${num2} = ${num1 + num2}`
      });
    }
  }
  return list;
}

// 生成雙 45 題完整合併題庫：45 題「個位進位加法」＋ 45 題「十幾退位減法」(共 90 題全收錄)
function generateCombined90Problems() {
  const adds = generateCarryAdditionProblems();         // 45 題
  const subs = generateAllBorrowSubtractionProblems(); // 45 題
  const list = [];
  for (let i = 0; i < 45; i++) {
    list.push({ ...adds[i], id: 'c90_add_' + (i + 1) });
    list.push({ ...subs[i], id: 'c90_sub_' + (i + 1) });
  }
  return list;
}

const DEFAULT_BANKS = [
  {
    id: 'bank-default-combined-90',
    name: '🌟 基礎加減雙45題全收錄 (進位加法 + 十幾退位減法·共90題)',
    description: '完整收錄「個位數加個位數（45題進位加法）」與「十幾減個位數（45題必退位減法）」，總共兩個 45 題合併成 90 題完整大題庫！',
    type: 'mixed',
    isPreset: true,
    problems: generateCombined90Problems(),
    createdAt: 1729700000000
  },
  {
    id: 'bank-default-borrow-sub',
    name: '🔟 十幾減個位數 (必退位減法 45題全收錄)',
    description: '被減數十位數均為 1 (10~18)，且個位數不夠減必須向十位借位，45 題完整收錄不漏題',
    type: 'subtraction',
    isPreset: true,
    problems: generateAllBorrowSubtractionProblems(),
    createdAt: 1729700001000
  },
  {
    id: 'bank-default-carry-add',
    name: '➕ 個位數加個位數 (進位加法專項 45題)',
    description: '個位數與個位數相加產生進位 (和為 10~18)，精熟 10 的互補數與滿十進位',
    type: 'addition',
    isPreset: true,
    problems: generateCarryAdditionProblems(),
    createdAt: 1729700002000
  },
  {
    id: 'bank-default-all-20',
    name: '⚡ 20以內加減法精熟大題庫 (126題全合集)',
    description: '完整收錄 1~9 個位數加法 (81題) 與十幾必退位減法 (45題)，全卷大綜合',
    type: 'all',
    isPreset: true,
    problems: [...generateAllSingleAdditionProblems(), ...generateAllBorrowSubtractionProblems()],
    createdAt: 1729700003000
  }
];

class BankManager {
  constructor() {
    this.banks = [];
    this.activeBankId = null;
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BANKS);
      if (saved) {
        this.banks = JSON.parse(saved);
        // 更新或補全預設題庫
        for (let i = DEFAULT_BANKS.length - 1; i >= 0; i--) {
          const def = DEFAULT_BANKS[i];
          const idx = this.banks.findIndex(b => b.id === def.id);
          if (idx >= 0) {
            this.banks[idx] = def;
          } else {
            this.banks.unshift(def);
          }
        }
      } else {
        this.banks = [...DEFAULT_BANKS];
        this.saveToStorage();
      }

      const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_BANK);
      if (activeId && this.banks.some(b => b.id === activeId)) {
        this.activeBankId = activeId;
      } else if (this.banks.length > 0) {
        this.activeBankId = this.banks[0].id;
      }
    } catch (e) {
      console.error('Failed to load math banks:', e);
      this.banks = [...DEFAULT_BANKS];
      this.activeBankId = this.banks[0].id;
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_BANKS, JSON.stringify(this.banks));
      if (this.activeBankId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_BANK, this.activeBankId);
      }
    } catch (e) {
      console.error('Failed to save math banks:', e);
    }
  }

  getBanks() {
    return this.banks;
  }

  getActiveBank() {
    return this.banks.find(b => b.id === this.activeBankId) || this.banks[0] || null;
  }

  setActiveBank(id) {
    if (this.banks.some(b => b.id === id)) {
      this.activeBankId = id;
      this.saveToStorage();
    }
  }

  getBankById(id) {
    return this.banks.find(b => b.id === id) || null;
  }

  addBank(name, description, rawFormulas) {
    let problems = [];

    if (Array.isArray(rawFormulas)) {
      problems = rawFormulas;
    } else if (typeof rawFormulas === 'string') {
      problems = this.parseFormulas(rawFormulas);
    }

    if (problems.length === 0) return null;

    const newBank = {
      id: 'bank-user-' + Date.now(),
      name: name.trim() || '自訂數學題庫',
      description: description.trim() || '使用者自訂加減法題庫',
      isPreset: false,
      problems: problems,
      createdAt: Date.now()
    };

    this.banks.push(newBank);
    this.activeBankId = newBank.id;
    this.saveToStorage();
    return newBank;
  }

  deleteBank(id) {
    const target = this.banks.find(b => b.id === id);
    if (!target || target.isPreset) return false;

    this.banks = this.banks.filter(b => b.id !== id);
    if (this.activeBankId === id) {
      this.activeBankId = this.banks[0] ? this.banks[0].id : null;
    }
    this.saveToStorage();
    return true;
  }

  /**
   * 解析純文字算式 (如 "8 + 7 = 15" 或 "14 - 6" 或一行一題)
   */
  parseFormulas(rawText) {
    if (!rawText) return [];
    const lines = rawText.split(/\r?\n/);
    const problems = [];
    let id = 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // 匹配數字 運算子 數字 (= 數字)
      const match = line.match(/(\d+)\s*([\+\-])\s*(\d+)/);
      if (match) {
        const num1 = parseInt(match[1], 10);
        const op = match[2];
        const num2 = parseInt(match[3], 10);
        const answer = op === '+' ? num1 + num2 : num1 - num2;
        const isRegroup = op === '+' ? (num1 % 10 + num2 % 10 >= 10) : (num1 % 10 < num2 % 10);

        problems.push({
          id: 'custom_' + (id++),
          num1,
          op,
          num2,
          answer,
          isRegroup,
          text: `${num1} ${op} ${num2} = ${answer}`
        });
      }
    }
    return problems;
  }

  /**
   * 根據設定抽取題目
   */
  pickQuestions(bankId, count = 20, random = true) {
    const bank = this.getBankById(bankId) || this.getActiveBank();
    if (!bank || !bank.problems || bank.problems.length === 0) return [];

    let pool = [...bank.problems];
    if (random) {
      pool.sort(() => Math.random() - 0.5);
    }

    if (count === 'all' || count >= pool.length) {
      return pool.map((p, idx) => ({ ...p, examIndex: idx + 1 }));
    }

    const n = Math.min(pool.length, Math.max(1, parseInt(count, 10) || 20));
    return pool.slice(0, n).map((p, idx) => ({ ...p, examIndex: idx + 1 }));
  }
}

const bankManager = new BankManager();


// === 測驗紀錄與錯題模組 ===
/**
 * 數學測驗歷次紀錄與錯題管理模組
 * 記錄：測驗時間、題庫、總題數、得分、耗時、每題答題與錯題清單
 * 支援：單筆刪除、錯題專項重測、歷史統計
 */

const STORAGE_KEY_RECORDS = 'gifted_s_math_exam_records';

class RecordsManager {
  constructor() {
    this.records = [];
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        this.records = JSON.parse(saved);
      } else {
        this.records = [];
      }
    } catch (e) {
      console.error('Failed to load math exam records:', e);
      this.records = [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(this.records));
    } catch (e) {
      console.error('Failed to save math exam records:', e);
    }
  }

  getRecords() {
    return [...this.records].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  addRecord({ bankName, totalCount, correctCount, wrongCount, score, timeSpentSec, items, wrongProblems }) {
    const newRecord = {
      id: 'rec_math_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      bankName: bankName || '基礎加減測驗',
      totalCount: totalCount,
      correctCount: correctCount,
      wrongCount: wrongCount,
      score: score,
      timeSpentSec: timeSpentSec || 0,
      avgSpeedSec: totalCount > 0 ? (timeSpentSec / totalCount).toFixed(1) : '0',
      wrongProblems: (wrongProblems || []).map(wp => {
        const uAns = (wp.userAnswer !== undefined && wp.userAnswer !== null && String(wp.userAnswer).trim() !== '')
          ? String(wp.userAnswer).trim()
          : '未作答';
        return {
          num1: wp.num1,
          op: wp.op,
          num2: wp.num2,
          answer: wp.answer,
          userAnswer: uAns,
          formula: `${wp.num1} ${wp.op} ${wp.num2} = ${wp.answer}`
        };
      }),
      items: (items || []).map(item => ({
        num1: item.num1,
        op: item.op,
        num2: item.num2,
        answer: item.answer,
        userAnswer: (item.userAnswer !== undefined && item.userAnswer !== null && String(item.userAnswer).trim() !== '')
          ? String(item.userAnswer).trim()
          : '未作答',
        isCorrect: !!item.isCorrect,
        formula: `${item.num1} ${item.op} ${item.num2} = ${item.answer}`
      }))
    };

    this.records.unshift(newRecord);
    this.saveToStorage();
    return newRecord;
  }

  deleteRecord(id) {
    this.records = this.records.filter(r => r.id !== id);
    this.saveToStorage();
  }

  clearAll() {
    this.records = [];
    this.saveToStorage();
  }

  getOverallStats() {
    const total = this.records.length;
    if (total === 0) {
      return { totalTests: 0, avgScore: 0, totalWrongCount: 0, avgSpeed: '0' };
    }

    const totalScore = this.records.reduce((sum, r) => sum + (r.score || 0), 0);
    const totalWrong = this.records.reduce((sum, r) => sum + (r.wrongCount || 0), 0);
    const totalTime = this.records.reduce((sum, r) => sum + (r.timeSpentSec || 0), 0);
    const totalQuestions = this.records.reduce((sum, r) => sum + (r.totalCount || 0), 0);

    return {
      totalTests: total,
      avgScore: Math.round(totalScore / total),
      totalWrongCount: totalWrong,
      avgSpeed: totalQuestions > 0 ? (totalTime / totalQuestions).toFixed(1) : '0'
    };
  }

  getTopWrongProblems(limit = 10) {
    const freqMap = {};
    for (const rec of this.records) {
      if (Array.isArray(rec.wrongProblems)) {
        for (const wp of rec.wrongProblems) {
          const key = `${wp.num1} ${wp.op} ${wp.num2}`;
          if (!freqMap[key]) {
            freqMap[key] = {
              num1: wp.num1,
              op: wp.op,
              num2: wp.num2,
              answer: wp.answer,
              count: 0,
              userAnswers: []
            };
          }
          freqMap[key].count++;
          if (wp.userAnswer && wp.userAnswer !== '未作答' && wp.userAnswer !== '未填寫') {
            freqMap[key].userAnswers.push(wp.userAnswer);
          }
        }
      }
    }

    return Object.values(freqMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

const recordsManager = new RecordsManager();


// === 主控制器 ===
/**
 * 數學簡單測驗 App 主控制器
 * 支援：個位進位加法、十幾退位減法、全卷跳題、交卷前總覽、自動批改與錯題專項重測
 */


const STORAGE_KEY_SETTINGS = 'gifted_s_math_exam_settings';

class MathExamController {
  constructor() {
    this.settings = {
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

    this.initDOM();
    this.loadSettings();
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
    this.settings.soundEffects = this.settingSound.checked;
    this.settings.defaultCount = this.settingDefaultCount.value;
    this.settings.defaultTimer = this.settingDefaultTimer.value;

    sound.setMuted(!this.settings.soundEffects);

    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
      sound.playCorrect();
      alert('✅ 設定已成功儲存！');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
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
      questions: rawQuestions.map((q) => ({
        id: q.id,
        num1: q.num1,
        op: q.op,
        num2: q.num2,
        answer: q.answer,
        isRegroup: q.isRegroup,
        userAnswer: '',
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

    this.updatePillStrip();
  }

  saveCurrentQuestionState() {
    if (this.activeExam.questions.length === 0) return;
    const q = this.activeExam.questions[this.activeExam.currentIndex];
    if (!q) return;

    q.userAnswer = this.currentInput;
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
        const uAns = (q.userAnswer !== undefined && q.userAnswer !== null && String(q.userAnswer).trim() !== '')
          ? String(q.userAnswer).trim()
          : '未作答';
        wrongProblems.push({
          num1: q.num1,
          op: q.op,
          num2: q.num2,
          answer: q.answer,
          userAnswer: uAns
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

  renderResultScreen({ score, totalCount, correctCount, wrongCount, timeSpent }) {
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
    this.activeExam.questions.forEach((q) => {
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
        </div>
      `;

      this.resultDetailsList.appendChild(row);
    });
  }

  retestWrongProblems() {
    const wrongQs = this.activeExam.questions.filter(q => !q.isCorrect);
    if (wrongQs.length === 0) return;

    this.activeExam.questions = wrongQs.map((q) => ({
      id: q.id,
      num1: q.num1,
      op: q.op,
      num2: q.num2,
      answer: q.answer,
      isRegroup: q.isRegroup,
      userAnswer: '',
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
        let wrongNote = '';
        if (item.userAnswers && item.userAnswers.length > 0) {
          const uniqueAnswers = [...new Set(item.userAnswers)].slice(0, 2);
          wrongNote = ` <span style="font-size: 0.8rem; opacity: 0.9; color: #fee2e2;">(常誤填: ${uniqueAnswers.join(', ')})</span>`;
        }
        pill.innerHTML = `<span>${item.num1} ${item.op} ${item.num2} = ${item.answer}</span> <small style="opacity: 0.85;">(${item.count}次)</small>${wrongNote}`;
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

      // 提取錯題資訊並相容舊資料結構
      const wrongList = (rec.wrongProblems || []).map(w => {
        let uAns = w.userAnswer;
        if (uAns === undefined || uAns === null || uAns === '') {
          if (rec.items && Array.isArray(rec.items)) {
            const foundItem = rec.items.find(it => it.num1 === w.num1 && it.op === w.op && it.num2 === w.num2);
            if (foundItem && foundItem.userAnswer !== undefined && foundItem.userAnswer !== null && foundItem.userAnswer !== '') {
              uAns = foundItem.userAnswer;
            }
          }
        }
        if (uAns === undefined || uAns === null || String(uAns).trim() === '') {
          uAns = '未填寫';
        }
        return {
          num1: w.num1,
          op: w.op,
          num2: w.num2,
          answer: w.answer,
          userAnswer: uAns
        };
      });

      card.innerHTML = `
        <div class="record-header-row">
          <div>
            <div class="record-title">${rec.bankName}</div>
            <div class="record-meta">
              <span>📅 ${rec.dateStr}</span> · 
              <span>共 ${rec.totalCount} 題</span> · 
              <span style="color: #16a34a; font-weight: 700;">答對 ${rec.correctCount} 題</span> · 
              <span style="color: ${rec.wrongCount > 0 ? '#dc2626' : '#64748b'}; font-weight: 700;">答錯 ${rec.wrongCount} 題</span> · 
              <span>用時 ${this.timer.formatTime(rec.timeSpentSec)}</span>
            </div>
          </div>
          <div class="record-badge-score ${scoreClass}">${rec.score} 分</div>
        </div>

        ${wrongList.length > 0 ? `
          <div class="record-wrong-box">
            <div class="record-wrong-title">
              <span>❌ 錯題與作答記錄 (${wrongList.length} 題)：</span>
            </div>
            <div class="record-wrong-chips">
              ${wrongList.map(w => `
                <div class="record-wrong-chip">
                  <span class="wrong-chip-formula">${w.num1} ${w.op} ${w.num2} = ${w.answer}</span>
                  <span class="wrong-chip-divider">|</span>
                  <span class="wrong-chip-ans">誤填：<strong class="wrong-chip-val">${w.userAnswer}</strong></span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="record-perfect-box">
            <span>🌟 滿分全對！所有題目均正確答對！</span>
          </div>
        `}

        <div class="record-footer-actions">
          ${rec.items && rec.items.length > 0 ? `
            <button class="tool-btn btn-view-rec-detail" data-rec-id="${rec.id}" style="padding: 6px 14px; font-size: 0.85rem;">
              <span>📋 查看整份作答明細</span>
            </button>
          ` : ''}
          <button class="tool-btn danger btn-del-record" data-rec-id="${rec.id}" title="刪除此筆紀錄" style="padding: 6px 12px; font-size: 0.85rem;">
            <span>🗑️ 刪除紀錄</span>
          </button>
        </div>
      `;

      const viewDetailBtn = card.querySelector('.btn-view-rec-detail');
      if (viewDetailBtn) {
        viewDetailBtn.addEventListener('click', () => {
          sound.playTap();
          this.openRecordDetailModal(rec);
        });
      }

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

  openRecordDetailModal(rec) {
    const modal = document.getElementById('modal-record-detail');
    const title = document.getElementById('modal-rec-detail-title');
    const subtitle = document.getElementById('modal-rec-detail-subtitle');
    const list = document.getElementById('modal-rec-detail-list');
    if (!modal || !list) return;

    title.textContent = `📋 測驗作答明細 - ${rec.bankName}`;
    subtitle.textContent = `${rec.dateStr} · 得分：${rec.score} 分 · 共 ${rec.totalCount} 題 · 答對 ${rec.correctCount} 題 · 答錯 ${rec.wrongCount} 題 · 用時 ${this.timer.formatTime(rec.timeSpentSec)}`;
    list.innerHTML = '';

    (rec.items || []).forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'result-detail-row ' + (it.isCorrect ? 'correct' : 'wrong');
      const userAnsText = (it.userAnswer !== undefined && it.userAnswer !== null && String(it.userAnswer).trim() !== '') ? it.userAnswer : '未填答';

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.25rem;">${it.isCorrect ? '✅' : '❌'}</span>
          <div>
            <div class="detail-formula">第 ${idx + 1} 題：${it.num1} ${it.op} ${it.num2} = ${it.answer}</div>
            <div style="font-size: 0.8rem; color: #64748b;">${it.op === '+' ? '加法運算' : '退位減法'}</div>
          </div>
        </div>
        <div class="detail-answer-wrap">
          <span>作答內容：<strong class="detail-user-ans ${it.isCorrect ? 'correct' : 'wrong'}">${userAnsText}</strong></span>
          ${!it.isCorrect ? `<span>正確答案：<strong class="detail-correct-ans">${it.answer}</strong></span>` : ''}
        </div>
      `;
      list.appendChild(row);
    });

    modal.classList.add('active');
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
      pill.className = 'problem-pill-large';
      pill.textContent = `${p.num1} ${p.op} ${p.num2} = ${p.answer}`;
      this.modalBankProblemsGrid.appendChild(pill);
    });

    this.modalBankProblems.classList.add('active');
  }
}

// 啟動主控制器
window.addEventListener('DOMContentLoaded', () => {
  window.app = new MathExamController();
});


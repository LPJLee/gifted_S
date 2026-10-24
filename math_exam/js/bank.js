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

export const DEFAULT_BANKS = [
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

export const bankManager = new BankManager();

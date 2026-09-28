/**
 * 題庫管理模組 (LocalStorage 持久化儲存與匯入匯出)
 */

const STORAGE_KEY_BANKS = 'gifted_s_word_banks';
const STORAGE_KEY_ACTIVE_BANK = 'gifted_s_active_bank_id';

// 預設示範題庫 (國小經典常用生字詞語 20 題)
const DEFAULT_BANKS = [
  {
    id: 'bank-default-1',
    name: '國語常用生字測驗 (20題)',
    words: [
      '學校', '老師', '同學', '讀書', '寫字',
      '美麗', '高興', '遵守', '禮貌', '感謝',
      '太陽', '月亮', '森林', '海洋', '希望',
      '勇氣', '努力', '快樂', '健康', '和平'
    ],
    createdAt: Date.now()
  },
  {
    id: 'bank-default-2',
    name: '基礎單字練習 (10題)',
    words: ['春', '夏', '秋', '冬', '山', '水', '花', '鳥', '風', '雨'],
    createdAt: Date.now()
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
      console.error('Failed to load banks from localStorage:', e);
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
      console.error('Failed to save banks to localStorage:', e);
    }
  }

  getAllBanks() {
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

  /**
   * 將使用者輸入的多行文字或逗號分隔文字解析為乾淨的詞語陣列
   * @param {string} textRaw 
   * @returns {string[]}
   */
  static parseWordText(textRaw) {
    if (!textRaw || typeof textRaw !== 'string') return [];
    return textRaw
      .split(/[\n\r,，、;；\s]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  }

  /**
   * 新增題庫
   */
  createBank(name, wordsText) {
    const words = BankManager.parseWordText(wordsText);
    const newBank = {
      id: 'bank-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: name.trim() || '未命名題庫',
      words: words,
      createdAt: Date.now()
    };
    this.banks.unshift(newBank);
    this.activeBankId = newBank.id;
    this.saveToStorage();
    return newBank;
  }

  /**
   * 更新現有題庫
   */
  updateBank(id, name, wordsText) {
    const bank = this.banks.find(b => b.id === id);
    if (!bank) return false;

    bank.name = name.trim() || bank.name;
    bank.words = BankManager.parseWordText(wordsText);
    this.saveToStorage();
    return true;
  }

  /**
   * 刪除題庫
   */
  deleteBank(id) {
    if (this.banks.length <= 1) {
      alert('請至少保留一個題庫！');
      return false;
    }
    this.banks = this.banks.filter(b => b.id !== id);
    if (this.activeBankId === id) {
      this.activeBankId = this.banks[0].id;
    }
    this.saveToStorage();
    return true;
  }

  /**
   * 匯出所有題庫為 JSON 檔案
   */
  exportToJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.banks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `國語聽寫題庫_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * 從 JSON 字串匯入題庫
   */
  importFromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data) && data.length > 0 && data[0].words) {
        this.banks = data;
        this.activeBankId = this.banks[0].id;
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to import JSON:', e);
      return false;
    }
  }
}

export const bankManager = new BankManager();

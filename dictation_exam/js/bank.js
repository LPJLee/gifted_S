/**
 * 題庫管理模組 (相容並共享 gifted_s_word_banks 題庫)
 */

const STORAGE_KEY_BANKS = 'gifted_s_word_banks';
const STORAGE_KEY_ACTIVE_BANK = 'gifted_s_active_bank_id';

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
      console.error('Failed to load banks:', e);
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
      console.error('Failed to save banks:', e);
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

  addBank(name, rawText) {
    const words = this.parseWords(rawText);
    if (words.length === 0) return null;

    const newBank = {
      id: 'bank-' + Date.now(),
      name: name.trim() || '未命名題庫',
      words: words,
      createdAt: Date.now()
    };

    this.banks.push(newBank);
    this.activeBankId = newBank.id;
    this.saveToStorage();
    return newBank;
  }

  updateBank(id, name, rawText) {
    const bank = this.banks.find(b => b.id === id);
    if (!bank) return false;

    const words = this.parseWords(rawText);
    if (words.length === 0) return false;

    bank.name = name.trim() || bank.name;
    bank.words = words;
    this.saveToStorage();
    return true;
  }

  deleteBank(id) {
    if (this.banks.length <= 1) {
      alert('至少需要保留一個題庫！');
      return false;
    }

    this.banks = this.banks.filter(b => b.id !== id);
    if (this.activeBankId === id) {
      this.activeBankId = this.banks[0].id;
    }
    this.saveToStorage();
    return true;
  }

  parseWords(rawText) {
    if (!rawText) return [];
    const separators = /[\n,，、\s\t]+/;
    return rawText
      .split(separators)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  }

  exportJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.banks, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `dictation_word_banks_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  }

  importJSON(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) throw new Error('題庫格式錯誤');

      let validCount = 0;
      imported.forEach(item => {
        if (item.name && Array.isArray(item.words) && item.words.length > 0) {
          const exists = this.banks.some(b => b.id === item.id);
          const newId = exists ? 'bank-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4) : (item.id || 'bank-' + Date.now());
          this.banks.push({
            id: newId,
            name: item.name,
            words: item.words,
            createdAt: item.createdAt || Date.now()
          });
          validCount++;
        }
      });

      if (validCount > 0) {
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const bankManager = new BankManager();
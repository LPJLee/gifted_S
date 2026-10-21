/**
 * 測驗歷次紀錄與錯題管理模組
 * 遵循指示：不儲存寫字圖片樣子，只記錄該題的文字與對錯狀態！
 */

const STORAGE_KEY_RECORDS = 'gifted_s_exam_records';

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
      console.error('Failed to load exam records:', e);
      this.records = [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(this.records));
    } catch (e) {
      console.error('Failed to save exam records:', e);
    }
  }

  getRecords() {
    return [...this.records].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  addRecord({ bankName, totalCount, correctCount, wrongCount, score, wrongWords, items }) {
    const newRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      bankName: bankName || '常用生字',
      totalCount: totalCount,
      correctCount: correctCount,
      wrongCount: wrongCount,
      score: score,
      wrongWords: wrongWords || [], // 僅儲存題目文字！
      items: (items || []).map(item => ({
        word: item.word,
        isCorrect: !!item.isCorrect
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
      return { totalTests: 0, avgScore: 0, totalWrongCount: 0 };
    }

    const totalScore = this.records.reduce((sum, r) => sum + (r.score || 0), 0);
    const totalWrong = this.records.reduce((sum, r) => sum + ((r.wrongWords && r.wrongWords.length) || 0), 0);

    return {
      totalTests: total,
      avgScore: Math.round(totalScore / total),
      totalWrongCount: totalWrong
    };
  }

  getTopWrongWords(limit = 10) {
    const freqMap = {};
    for (const rec of this.records) {
      if (Array.isArray(rec.wrongWords)) {
        for (const w of rec.wrongWords) {
          if (!w) continue;
          freqMap[w] = (freqMap[w] || 0) + 1;
        }
      }
    }

    const list = Object.keys(freqMap).map(w => ({ word: w, count: freqMap[w] }));
    list.sort((a, b) => b.count - a.count);
    return list.slice(0, limit);
  }
}

export const recordsManager = new RecordsManager();
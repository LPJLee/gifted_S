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

export const recordsManager = new RecordsManager();

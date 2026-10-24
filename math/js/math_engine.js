/**
 * 數學加減題目生成引擎
 * 支援 1~3 位數、加減法/混合、進位/退位約束、防負數出題與直式結構解析
 */

export class MathEngine {
  /**
   * @param {Object} options 
   * @param {number} options.digitMode 1 (一位數), 2 (二位數), 3 (三位數), 'mixed_2_1', 'mixed_3_2', 'mixed_all'
   * @param {string} options.operation '+' | '-' | 'mixed'
   * @param {string} options.regroupMode 'all' (隨機) | 'no_regroup' (不進位/不退位) | 'must_regroup' (必進位/必退位)
   * @param {number} options.questionCount 總題數
   */
  constructor(options = {}) {
    this.digitMode = options.digitMode || 2;
    this.operation = options.operation || '+';
    this.regroupMode = options.regroupMode || 'all';
    this.questionCount = options.questionCount || 10;
  }

  /**
   * 根據位數模式取得隨機數範圍
   */
  getRange(mode) {
    switch (String(mode)) {
      case '1':
        return { min: 1, max: 9 };
      case '2':
        return { min: 10, max: 99 };
      case '3':
        return { min: 100, max: 999 };
      default:
        return { min: 10, max: 99 };
    }
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 檢查加法是否會產生進位
   */
  hasCarry(a, b) {
    let carry = 0;
    while (a > 0 || b > 0) {
      const d1 = a % 10;
      const d2 = b % 10;
      if (d1 + d2 + carry >= 10) {
        return true;
      }
      carry = Math.floor((d1 + d2 + carry) / 10);
      a = Math.floor(a / 10);
      b = Math.floor(b / 10);
    }
    return false;
  }

  /**
   * 檢查減法是否會產生借位 (退位)
   */
  hasBorrow(a, b) {
    while (a > 0 || b > 0) {
      const d1 = a % 10;
      const d2 = b % 10;
      if (d1 < d2) {
        return true;
      }
      a = Math.floor(a / 10);
      b = Math.floor(b / 10);
    }
    return false;
  }

  /**
   * 根據設定與當前運算子決定出題數字對
   * @param {string} op '+' | '-'
   */
  pickDigits(op = '+') {
    let min1, max1, min2, max2;

    if (this.digitMode === 'grade1_20') {
      if (op === '+') {
        // 個位數加個位數 (可以進位)
        return { min1: 1, max1: 9, min2: 1, max2: 9 };
      } else {
        // 兩位數減個位數 (十位數為 1 且退位)
        return { min1: 10, max1: 18, min2: 1, max2: 9 };
      }
    } else if (this.digitMode === '1') {
      if (op === '-' && this.regroupMode === 'must_regroup') {
        // 20以內退位減法 (小一標準課綱退位減法): 被減數 11~18, 減數 2~9
        return { min1: 11, max1: 18, min2: 2, max2: 9 };
      }
      return { min1: 1, max1: 9, min2: 1, max2: 9 };
    } else if (this.digitMode === '2') {
      return { min1: 10, max1: 99, min2: 10, max2: 99 };
    } else if (this.digitMode === '3') {
      return { min1: 100, max1: 999, min2: 100, max2: 999 };
    } else if (this.digitMode === 'mixed_2_1') {
      // 二位數與一位數
      return { min1: 10, max1: 99, min2: 1, max2: 9 };
    } else if (this.digitMode === 'mixed_3_2') {
      // 三位數與二位數
      return { min1: 100, max1: 999, min2: 10, max2: 99 };
    } else {
      // mixed_all: 1~3 位數全部混合
      let d1 = this.getRandomInt(1, 3);
      // 若為減法且必退位，被減數至少需要 2 位數才可能退位借位
      if (op === '-' && this.regroupMode === 'must_regroup') {
        d1 = this.getRandomInt(2, 3);
      }
      const d2 = this.getRandomInt(1, d1); // 第二個數小於等於第一個數位數
      const r1 = this.getRange(d1);
      const r2 = this.getRange(d2);
      return { min1: r1.min, max1: r1.max, min2: r2.min, max2: r2.max };
    }
  }

  /**
   * 防禦性安全題目建構 (極端重試耗盡時調用，保證數學運算 100% 正確)
   */
  createFallbackQuestion(id) {
    let op = this.operation === 'mixed' ? '+' : this.operation;
    let num1, num2;
    if (this.digitMode === 'grade1_20') {
      if (op === '+') {
        num1 = 8; num2 = 7;
      } else {
        num1 = 14; num2 = 6;
      }
      const answer = op === '+' ? num1 + num2 : num1 - num2;
      return {
        id,
        num1,
        num2,
        op,
        answer,
        isRegroup: true,
        vertical: {
          top: String(num1),
          bottom: String(num2),
          op,
          maxDigits: Math.max(String(num1).length, String(num2).length, String(answer).length)
        }
      };
    }
    if (op === '+') {
      if (this.regroupMode === 'no_regroup') {
        num1 = 23; num2 = 14;
      } else {
        num1 = 28; num2 = 15;
      }
    } else {
      if (this.regroupMode === 'no_regroup') {
        num1 = 35; num2 = 12;
      } else {
        num1 = 32; num2 = 15;
      }
    }
    const answer = op === '+' ? num1 + num2 : num1 - num2;
    const isRegroup = op === '+' ? this.hasCarry(num1, num2) : this.hasBorrow(num1, num2);
    return {
      id,
      num1,
      num2,
      op,
      answer,
      isRegroup,
      vertical: {
        top: String(num1),
        bottom: String(num2),
        op,
        maxDigits: Math.max(String(num1).length, String(num2).length, String(answer).length)
      }
    };
  }

  /**
   * 產生單一題目
   */
  generateSingle(id = 1) {
    let attempts = 0;

    while (attempts < 500) {
      attempts++;

      // 1. 決定運算子
      let op = this.operation;
      if (op === 'mixed') {
        op = Math.random() < 0.5 ? '+' : '-';
      }

      // 2. 根據運算子與模式決定數字範圍
      const { min1, max1, min2, max2 } = this.pickDigits(op);
      let num1 = this.getRandomInt(min1, max1);
      let num2 = this.getRandomInt(min2, max2);

      if (op === '-') {
        if (this.digitMode === 'grade1_20') {
          // 嚴格確保十位數為 1 (10~18) 且個位小於減數 (必退位)
          if (num1 < 10 || num1 > 18 || num2 < 1 || num2 > 9 || (num1 % 10 >= num2)) {
            continue;
          }
        } else {
          // 確保大數減小數 (避免負數)
          if (num1 < num2) {
            const temp = num1;
            num1 = num2;
            num2 = temp;
          }

          // 避免減數為0或兩數相同導致答案為0
          if (num1 === num2 || num2 === 0) {
            continue;
          }

          const isBorrow = this.hasBorrow(num1, num2);
          if (this.regroupMode === 'no_regroup' && isBorrow) {
            continue;
          }
          if (this.regroupMode === 'must_regroup' && !isBorrow) {
            continue;
          }
        }

        const isBorrow = this.hasBorrow(num1, num2);
        const answer = num1 - num2;
        return {
          id,
          num1,
          num2,
          op,
          answer,
          isRegroup: isBorrow,
          vertical: {
            top: String(num1),
            bottom: String(num2),
            op: op,
            maxDigits: Math.max(String(num1).length, String(num2).length, String(answer).length)
          }
        };
      } else {
        const isCarry = this.hasCarry(num1, num2);
        if (this.regroupMode === 'no_regroup' && isCarry) {
          continue;
        }
        if (this.regroupMode === 'must_regroup' && !isCarry) {
          continue;
        }

        const answer = num1 + num2;
        return {
          id,
          num1,
          num2,
          op,
          answer,
          isRegroup: isCarry,
          vertical: {
            top: String(num1),
            bottom: String(num2),
            op: op,
            maxDigits: Math.max(String(num1).length, String(num2).length, String(answer).length)
          }
        };
      }
    }

    return this.createFallbackQuestion(id);
  }

  /**
   * 產生完整測驗題目清單
   */
  generateQuiz() {
    const list = [];
    const used = new Set();

    for (let i = 1; i <= this.questionCount; i++) {
      let q;
      let tries = 0;
      do {
        tries++;
        q = this.generateSingle(i);
      } while (used.has(`${q.num1}${q.op}${q.num2}`) && tries < 50);

      used.add(`${q.num1}${q.op}${q.num2}`);
      list.push(q);
    }
    return list;
  }
}

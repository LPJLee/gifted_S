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
   * 根據設定決定出題數字對
   */
  pickDigits() {
    let min1, max1, min2, max2;

    if (this.digitMode === '1') {
      ({ min: min1, max: max1 } = this.getRange('1'));
      ({ min: min2, max: max2 } = this.getRange('1'));
    } else if (this.digitMode === '2') {
      ({ min: min1, max: max1 } = this.getRange('2'));
      ({ min: min2, max: max2 } = this.getRange('2'));
    } else if (this.digitMode === '3') {
      ({ min: min1, max: max1 } = this.getRange('3'));
      ({ min: min2, max: max2 } = this.getRange('3'));
    } else if (this.digitMode === 'mixed_2_1') {
      // 二位數與一位數
      ({ min: min1, max: max1 } = this.getRange('2'));
      ({ min: min2, max: max2 } = this.getRange('1'));
    } else if (this.digitMode === 'mixed_3_2') {
      // 三位數與二位數
      ({ min: min1, max: max1 } = this.getRange('3'));
      ({ min: min2, max: max2 } = this.getRange('2'));
    } else {
      // mixed_all: 1~3 位數全部混合
      const d1 = this.getRandomInt(1, 3);
      const d2 = this.getRandomInt(1, d1); // 第二個數通常小於等於第一個數
      ({ min: min1, max: max1 } = this.getRange(d1));
      ({ min: min2, max: max2 } = this.getRange(d2));
    }

    return { min1, max1, min2, max2 };
  }

  /**
   * 產生單一題目
   */
  generateSingle(id = 1) {
    let op = this.operation;
    if (op === 'mixed') {
      op = Math.random() < 0.5 ? '+' : '-';
    }

    const { min1, max1, min2, max2 } = this.pickDigits();
    let num1, num2, answer;
    let attempts = 0;

    while (attempts < 200) {
      attempts++;
      num1 = this.getRandomInt(min1, max1);
      num2 = this.getRandomInt(min2, max2);

      if (op === '-') {
        // 確保不出現負數 (大數減小數)
        if (num1 < num2) {
          const temp = num1;
          num1 = num2;
          num2 = temp;
        }
        // 避免減數為0或兩數相同導致答案為0過於平淡 (可偶爾出現但不過多)
        if (num1 === num2 && Math.random() > 0.1) continue;

        answer = num1 - num2;

        if (this.regroupMode === 'no_regroup' && this.hasBorrow(num1, num2)) {
          continue;
        }
        if (this.regroupMode === 'must_regroup' && !this.hasBorrow(num1, num2)) {
          continue;
        }
      } else {
        answer = num1 + num2;

        if (this.regroupMode === 'no_regroup' && this.hasCarry(num1, num2)) {
          continue;
        }
        if (this.regroupMode === 'must_regroup' && !this.hasCarry(num1, num2)) {
          continue;
        }
      }

      break;
    }

    return {
      id,
      num1,
      num2,
      op,
      answer,
      isRegroup: op === '+' ? this.hasCarry(num1, num2) : this.hasBorrow(num1, num2),
      // 結構化直式呈現資訊
      vertical: {
        top: String(num1),
        bottom: String(num2),
        op: op,
        maxDigits: Math.max(String(num1).length, String(num2).length, String(answer).length)
      }
    };
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

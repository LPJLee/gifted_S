/**
 * 測驗計時器模組
 * 支援倒數計時 (含最後 3 秒提示) 與不限時正向計時，精度基於時間戳避免跳幀
 */

export class QuizTimer {
  constructor() {
    this.timerId = null;
    this.totalSeconds = 0;
    this.remainingSeconds = 0;
    this.elapsedSeconds = 0;
    this.isCountdown = true;
    this.isRunning = false;
    this.startTime = null;

    this.onTick = null;
    this.onWarning = null;
    this.onTimeout = null;
    this.warned = new Set();
  }

  /**
   * 啟動計時
   * @param {number} seconds 總秒數 (0 表示不限時)
   * @param {Function} onTick (state) => {}
   * @param {Function} onWarning (rem) => {}
   * @param {Function} onTimeout () => {}
   */
  start(seconds, onTick, onWarning, onTimeout) {
    this.stop();

    this.totalSeconds = Math.max(0, parseInt(seconds, 10) || 0);
    this.isCountdown = this.totalSeconds > 0;
    this.remainingSeconds = this.totalSeconds;
    this.elapsedSeconds = 0;
    this.onTick = onTick;
    this.onWarning = onWarning;
    this.onTimeout = onTimeout;
    this.warned.clear();
    this.isRunning = true;
    this.startTime = Date.now();

    // 觸發初始狀態
    this.emitTick();

    this.timerId = setInterval(() => {
      if (!this.isRunning) return;

      const now = Date.now();
      const diffSec = Math.floor((now - this.startTime) / 1000);

      if (this.isCountdown) {
        this.remainingSeconds = Math.max(0, this.totalSeconds - diffSec);
        this.elapsedSeconds = this.totalSeconds - this.remainingSeconds;

        // 最後 3 秒觸發警告
        if (this.remainingSeconds <= 3 && this.remainingSeconds > 0) {
          if (!this.warned.has(this.remainingSeconds)) {
            this.warned.add(this.remainingSeconds);
            if (this.onWarning) this.onWarning(this.remainingSeconds);
          }
        }

        this.emitTick();

        if (this.remainingSeconds <= 0) {
          this.stop();
          if (this.onTimeout) this.onTimeout();
        }
      } else {
        // 不限時正向計時
        this.elapsedSeconds = diffSec;
        this.emitTick();
      }
    }, 200);
  }

  emitTick() {
    if (!this.onTick) return;

    const percent = this.isCountdown
      ? (this.remainingSeconds / this.totalSeconds) * 100
      : 100;

    this.onTick({
      isCountdown: this.isCountdown,
      total: this.totalSeconds,
      remaining: this.remainingSeconds,
      elapsed: this.elapsedSeconds,
      percent: Math.max(0, Math.min(100, percent)),
      formatted: this.formatTime(this.isCountdown ? this.remainingSeconds : this.elapsedSeconds)
    });
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }
}

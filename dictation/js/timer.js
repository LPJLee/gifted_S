import { sound } from './sound.js';

/**
 * 測驗倒數計時器
 */
export class QuizTimer {
  constructor(defaultSeconds = 30) {
    this.totalSeconds = defaultSeconds;
    this.remainingSeconds = defaultSeconds;
    this.intervalId = null;
    this.isRunning = false;
    this.isExpired = false;

    // 回呼函式
    this.onTick = null;       // (remaining, total, percent) => {}
    this.onWarning = null;    // (remaining) => {}
    this.onExpire = null;     // () => {}
  }

  setDuration(sec) {
    this.totalSeconds = Math.max(5, parseInt(sec, 10) || 30);
    this.reset();
  }

  start() {
    this.stop();
    this.remainingSeconds = this.totalSeconds;
    this.isRunning = true;
    this.isExpired = false;

    if (this.onTick) {
      this.onTick(this.remainingSeconds, this.totalSeconds, 100);
    }

    this.intervalId = setInterval(() => {
      this.remainingSeconds--;

      const percent = Math.max(0, (this.remainingSeconds / this.totalSeconds) * 100);

      if (this.onTick) {
        this.onTick(this.remainingSeconds, this.totalSeconds, percent);
      }

      // 最後 5 秒警告音效與提示
      if (this.remainingSeconds <= 5 && this.remainingSeconds > 0) {
        sound.playTick();
        if (this.onWarning) {
          this.onWarning(this.remainingSeconds);
        }
      }

      // 時間到
      if (this.remainingSeconds <= 0) {
        this.stop();
        this.isExpired = true;
        sound.playTimesUp();
        if (this.onExpire) {
          this.onExpire();
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
    this.remainingSeconds = this.totalSeconds;
    this.isExpired = false;
    if (this.onTick) {
      this.onTick(this.remainingSeconds, this.totalSeconds, 100);
    }
  }
}

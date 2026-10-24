/**
 * 數學測驗計時器模組 (支援「不限時累積計時」、「全卷總時長倒數」與「單題獨立倒數」)
 */
import { sound } from './sound.js';

export class QuizTimer {
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

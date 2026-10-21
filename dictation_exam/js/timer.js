/**
 * 測驗計時器模組 (支援「不限時記錄模式」、「全卷總時長倒數」與「單題倒數」)
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
          sound.playTimesUp();
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

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
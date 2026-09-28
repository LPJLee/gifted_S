/**
 * Web Speech API 國語發音模組 (支援 iPad Safari 原生 zh-TW 高品質語音)
 */
class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.twVoice = null;
    this.rate = 0.85; // 稍慢語速，適合聽寫
    this.pitch = 1.0;
    this.isSpeaking = false;

    if (this.synth) {
      this.loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    
    // 優先尋找臺灣國語語音 (zh-TW, cmn-Hant-TW, 包含 Siri / 美佳 / 漢漢 / Google 國語)
    this.twVoice = this.voices.find(v => 
      v.lang === 'zh-TW' || 
      v.lang === 'cmn-Hant-TW' || 
      v.lang.replace('_', '-').toLowerCase() === 'zh-tw'
    ) || this.voices.find(v => v.lang.startsWith('zh'));
  }

  setRate(val) {
    this.rate = Math.max(0.5, Math.min(1.5, parseFloat(val) || 0.85));
  }

  /**
   * 朗讀詞語
   * @param {string} text 要朗讀的國字/詞語
   * @param {Function} onStart 開始朗讀回呼
   * @param {Function} onEnd 朗讀結束回呼
   */
  speak(text, onStart = null, onEnd = null) {
    if (!this.synth) {
      alert('您的瀏覽器不支援語音朗讀功能');
      if (onEnd) onEnd();
      return;
    }

    // 若正在播放，先取消
    if (this.synth.speaking) {
      this.synth.cancel();
    }

    if (!this.twVoice) {
      this.loadVoices();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.twVoice) {
      utterance.voice = this.twVoice;
      utterance.lang = this.twVoice.lang;
    } else {
      utterance.lang = 'zh-TW';
    }

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}

export const speech = new SpeechManager();

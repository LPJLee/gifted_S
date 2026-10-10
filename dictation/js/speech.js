/**
 * Web Speech API 國語發音模組 (支援 iPad Safari 原生 zh-TW 高品質語音、音量放大與人聲選擇)
 */
class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoiceURI = '';
    this.twVoice = null;
    this.rate = 0.85; // 稍慢語速，適合聽寫
    this.volume = 1.0; // 最大音量 (100%)
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
    this.findBestTwVoice();
  }

  findBestTwVoice() {
    if (!this.voices || this.voices.length === 0) return;

    // 若使用者已手動指定特定的語音
    if (this.selectedVoiceURI) {
      const found = this.voices.find(v => v.voiceURI === this.selectedVoiceURI);
      if (found) {
        this.twVoice = found;
        return;
      }
    }

    // 判斷是否為臺灣中文語音
    const isTaiwanese = (v) => {
      const lang = (v.lang || '').replace('_', '-').toLowerCase();
      const name = (v.name || '').toLowerCase();
      return (
        lang === 'zh-tw' ||
        lang === 'cmn-hant-tw' ||
        lang === 'cmn-tw' ||
        name.includes('taiwan') ||
        name.includes('台灣') ||
        name.includes('臺灣') ||
        name.includes('mei-jia') ||
        name.includes('美佳') ||
        name.includes('hanhan') ||
        name.includes('漢漢')
      );
    };

    const twVoices = this.voices.filter(isTaiwanese);

    if (twVoices.length > 0) {
      // 優先挑選 Siri、增強 (Enhanced) 或 Natural 品質的臺灣人聲
      const premiumVoice = twVoices.find(v => {
        const n = (v.name || '').toLowerCase();
        return n.includes('siri') || n.includes('enhanced') || n.includes('增強') || n.includes('natural');
      });
      this.twVoice = premiumVoice || twVoices[0];
    } else {
      // 次選：其他中文 (zh 開頭)
      this.twVoice = this.voices.find(v => (v.lang || '').toLowerCase().startsWith('zh')) || null;
    }
  }

  /**
   * 取得裝置上所有的中文語音清單
   */
  getChineseVoices() {
    if (!this.voices || this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices.filter(v => {
      const l = (v.lang || '').replace('_', '-').toLowerCase();
      const n = (v.name || '').toLowerCase();
      return l.startsWith('zh') || l.startsWith('cmn') || n.includes('taiwan') || n.includes('chinese');
    });
  }

  setVoice(voiceURI) {
    this.selectedVoiceURI = voiceURI || '';
    this.findBestTwVoice();
  }

  setRate(val) {
    this.rate = Math.max(0.5, Math.min(1.5, parseFloat(val) || 0.85));
  }

  setVolume(val) {
    this.volume = Math.max(0.1, Math.min(1.0, parseFloat(val) || 1.0));
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

    if (!this.twVoice || this.voices.length === 0) {
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
    utterance.volume = this.volume; // 設定為最高音量

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

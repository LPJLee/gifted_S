/**
 * Web Speech API 國語發音模組 (支援 iPad Safari 原生 zh-TW 高品質臺灣語音)
 */
class SpeechManager {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoiceURI = '';
    this.twVoice = null;
    this.rate = 0.85; // 適中語速，適合聽寫
    this.volume = 1.0;
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

    if (this.selectedVoiceURI) {
      const found = this.voices.find(v => v.voiceURI === this.selectedVoiceURI);
      if (found) {
        this.twVoice = found;
        return;
      }
    }

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
      const premiumVoice = twVoices.find(v => {
        const n = (v.name || '').toLowerCase();
        return n.includes('siri') || n.includes('enhanced') || n.includes('增強') || n.includes('natural');
      });
      this.twVoice = premiumVoice || twVoices[0];
    } else {
      this.twVoice = this.voices.find(v => (v.lang || '').toLowerCase().startsWith('zh')) || null;
    }
  }

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

  speak(text, onStart, onEnd) {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    this.stop();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = this.rate;
    utter.volume = this.volume;
    utter.pitch = this.pitch;

    if (this.twVoice) {
      utter.voice = this.twVoice;
      utter.lang = this.twVoice.lang;
    } else {
      utter.lang = 'zh-TW';
    }

    utter.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utter.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utter.onerror = (e) => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    this.synth.speak(utter);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}

export const speech = new SpeechManager();
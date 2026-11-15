// Procedural sound: every effect and the music loop are synthesized
// with WebAudio oscillators and noise — no audio files, no network.

const NOTES = [220.0, 261.63, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      this.startMusic();
    } catch (e) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol || 0.2, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* audio is best-effort */ }
  }

  noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.25, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      let node = src;
      if (lowpass) {
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = lowpass;
        src.connect(filt);
        node = filt;
      }
      node.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    } catch (e) { /* audio is best-effort */ }
  }

  shoot() { this.tone(880 + Math.random() * 120, 0.07, 'triangle', 0.10, 420); }
  hit() { this.tone(340, 0.06, 'square', 0.08, 180); }
  explode() { this.noise(0.28, 0.3, 900); this.tone(160, 0.25, 'sine', 0.22, 40); }
  pickup() { this.tone(660, 0.09, 'sine', 0.14, 990); }
  hurt() { this.tone(140, 0.3, 'sawtooth', 0.22, 60); this.noise(0.15, 0.2, 500); }
  dash() { this.noise(0.14, 0.14, 2400); }
  upgrade() {
    this.tone(523.25, 0.12, 'sine', 0.18);
    setTimeout(() => this.tone(659.25, 0.12, 'sine', 0.18), 90);
    setTimeout(() => this.tone(783.99, 0.2, 'sine', 0.2), 180);
  }
  boss() { this.tone(82, 0.9, 'sawtooth', 0.25, 55); this.noise(0.7, 0.2, 300); }
  waveClear() {
    this.tone(392, 0.14, 'sine', 0.16);
    setTimeout(() => this.tone(523.25, 0.22, 'sine', 0.16), 130);
  }

  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    const pattern = [0, 2, 4, 7, 4, 2, 5, 3];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const step = this.musicStep % pattern.length;
      const note = NOTES[pattern[step]];
      this.tone(note, 0.5, 'sine', 0.045);
      if (step === 0) this.tone(note / 2, 1.4, 'triangle', 0.05);
      this.musicStep += 1;
    }, 340);
  }
}

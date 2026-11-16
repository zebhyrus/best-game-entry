// Procedural sound: every effect and the music loop are synthesized
// with WebAudio oscillators and noise — no audio files, no network.

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

  // A short arpeggio helper: notes play in order, ms apart.
  arp(notes, gap, type, vol, dur) {
    notes.forEach((n, i) => {
      setTimeout(() => this.tone(n, dur || 0.16, type || 'sine', vol || 0.16), i * gap);
    });
  }

  shoot() { this.tone(880 + Math.random() * 120, 0.07, 'triangle', 0.10, 420); }

  // Per-weapon shot: more barrels sit lower and fatter, heavy rounds
  // land with a deeper thump, seekers whistle a touch higher.
  shootVariant(shots, damage, homing) {
    const base = 880 - Math.min(3, shots - 1) * 90 - (damage >= 20 ? 160 : 0) + (homing > 0 ? 90 : 0);
    this.tone(base + Math.random() * 90, 0.07, 'triangle', 0.10, base * 0.5);
    if (damage >= 20) this.noise(0.05, 0.08, 700);
  }

  hit() { this.tone(340, 0.06, 'square', 0.08, 180); }

  // Combo pitch ladder: every kill in the chain pushes the hit note
  // a semitone-ish step higher, so a hot streak sounds hotter.
  hitCombo(combo) {
    const step = Math.min(combo, 14);
    const f = 340 * Math.pow(1.045, step);
    this.tone(f, 0.06, 'square', 0.08, f * 0.55);
  }

  crit() {
    this.tone(1320, 0.12, 'triangle', 0.16, 880);
    this.tone(1760, 0.09, 'sine', 0.12);
    this.noise(0.08, 0.1, 4000);
  }

  explode() { this.noise(0.28, 0.3, 900); this.tone(160, 0.25, 'sine', 0.22, 40); }
  pickup() { this.tone(660, 0.09, 'sine', 0.14, 990); }
  hurt() { this.tone(140, 0.3, 'sawtooth', 0.22, 60); this.noise(0.15, 0.2, 500); }
  dash() { this.noise(0.14, 0.14, 2400); }

  upgrade() {
    this.arp([523.25, 659.25, 783.99], 90, 'sine', 0.18, 0.2);
  }

  boss() { this.tone(82, 0.9, 'sawtooth', 0.25, 55); this.noise(0.7, 0.2, 300); }

  // The Monarch's entrance: a low detuned growl that swells twice.
  bossRoar() {
    this.tone(70, 1.1, 'sawtooth', 0.28, 42);
    this.tone(105, 1.0, 'sawtooth', 0.18, 55);
    this.noise(0.9, 0.22, 260);
    setTimeout(() => this.tone(62, 0.5, 'sawtooth', 0.2, 40), 220);
  }

  // Boss death fanfare: a rising four-note call, then a bright chord.
  bossFanfare() {
    this.arp([523.25, 659.25, 783.99, 1046.5], 110, 'triangle', 0.2, 0.28);
    setTimeout(() => {
      this.tone(1046.5, 0.5, 'triangle', 0.22);
      this.tone(1318.5, 0.5, 'sine', 0.16);
      this.tone(783.99, 0.5, 'sine', 0.1);
    }, 450);
    this.noise(0.4, 0.08, 5000);
  }

  // Reward jingle: a quick ascending chime when the boss reward lands.
  rewardJingle() {
    this.arp([880, 1108.7, 1318.5, 1760], 70, 'sine', 0.16, 0.14);
  }

  // Low-hull warning: two dull beats, quiet enough to sit under fire.
  lowHp() {
    this.tone(220, 0.12, 'square', 0.12, 180);
    setTimeout(() => this.tone(220, 0.12, 'square', 0.12, 180), 160);
  }

  waveClear() {
    this.arp([392, 523.25], 130, 'sine', 0.16, 0.22);
  }

  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    // Am – F – C – G, one chord per 16-step bar. The lead plucks a
    // pattern over each chord; every fourth bar it jumps an octave.
    // A bass line walks the roots and light percussion keeps time:
    // a soft hat on the off-beats, a kick on beat one.
    const roots = [110, 87.31, 130.81, 98]; // A2 F2 C3 G2
    const chords = [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [261.63, 329.63, 392],
      [196, 246.94, 293.66],
    ];
    const leadPat = [0, -1, 2, -1, 4, -1, 3, 2, 0, -1, 2, 4, 7, 4, 2, -1];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const bar = Math.floor(this.musicStep / 16) % 4;
      const step = this.musicStep % 16;
      const chord = chords[bar];
      if (step % 4 === 0) this.tone(roots[bar], 1.1, 'triangle', 0.055);
      const li = leadPat[step];
      if (li >= 0) {
        const oct = (Math.floor(this.musicStep / 64) % 2 === 1) ? 2 : 1;
        this.tone(chord[li % chord.length] * oct, 0.4, 'sine', 0.04);
      }
      if (step % 2 === 1) this.noise(0.03, 0.02, 6000);
      if (step === 0) this.tone(120, 0.12, 'sine', 0.09, 45);
      this.musicStep += 1;
    }, 300);
  }
}

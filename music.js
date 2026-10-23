/* Código Rosa — original axé-inspired carnival groove, generated in the browser. */
'use strict';
window.RosaMusic = class RosaMusic {
  constructor(context) {
    this.ctx = context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.stepTime = 60 / 140 / 4;
    this.noise = this.makeNoise();
  }
  makeNoise() {
    const c = this.ctx, b = c.createBuffer(1, Math.ceil(c.sampleRate * .28), c.sampleRate);
    const samples = b.getChannelData(0);
    let seed = 8137;
    for (let i = 0; i < samples.length; i++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      samples[i] = seed / 2147483648 - 1;
    }
    return b;
  }
  envelope(start, length, peak, destination = this.master) {
    const c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(.0001, start);
    g.gain.linearRampToValueAtTime(peak, start + Math.min(.012, length * .12));
    g.gain.exponentialRampToValueAtTime(.0001, start + length);
    g.connect(destination);
    return g;
  }
  note(frequency, start, length, volume, type = 'triangle') {
    const c = this.ctx, o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(frequency, start);
    o.connect(this.envelope(start, length, volume));
    o.start(start); o.stop(start + length + .02);
  }
  kick(start, accent = 1) {
    const c = this.ctx, o = c.createOscillator(), g = this.envelope(start, .34, .43 * accent);
    o.type = 'sine';
    o.frequency.setValueAtTime(135, start);
    o.frequency.exponentialRampToValueAtTime(52, start + .15);
    o.connect(g); o.start(start); o.stop(start + .36);
  }
  percussion(start, volume, brightness, length = .07) {
    const c = this.ctx, source = c.createBufferSource(), filter = c.createBiquadFilter();
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = brightness;
    source.connect(filter); filter.connect(this.envelope(start, length, volume));
    source.start(start); source.stop(start + Math.min(length + .01, .27));
  }
  bell(start, high = false) {
    this.note(high ? 987.77 : 659.25, start, .10, .065, 'sine');
    this.note(high ? 1975.53 : 1318.51, start, .05, .017, 'sine');
  }
  timbal(start, high = false) {
    const c = this.ctx, o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(high ? 365 : 290, start);
    o.frequency.exponentialRampToValueAtTime(high ? 170 : 125, start + .10);
    o.connect(this.envelope(start, .12, .13));
    o.start(start);o.stop(start + .14);
  }
  horn(frequency, start, length = .17) {
    const c = this.ctx, o = c.createOscillator(), filter = c.createBiquadFilter();
    o.type = 'sawtooth';o.frequency.setValueAtTime(frequency, start);
    filter.type = 'lowpass';filter.frequency.value = 1900;
    o.connect(filter);filter.connect(this.envelope(start, length, .055));
    o.start(start);o.stop(start + length + .02);
    this.note(frequency * 1.003, start, length * .85, .019, 'square');
  }
  scheduleStep(n, when) {
    const beat = n % 16, bar = Math.floor(n / 16) % 4;
    const chords = [
      {bass: 55.00, tones: [261.63, 329.63, 440.00]}, // Am
      {bass: 43.65, tones: [261.63, 349.23, 440.00]}, // F
      {bass: 65.41, tones: [261.63, 329.63, 392.00]}, // C
      {bass: 49.00, tones: [246.94, 392.00, 493.88]}  // G
    ];
    const chord = chords[bar];
    // Carnival pulse: surdo, timbal, pandeiro/shaker and two-tone agogô.
    if (beat === 0 || beat === 8) this.kick(when, beat === 0 ? 1.15 : .95);
    if (beat === 4 || beat === 12) this.kick(when, .38);
    if ([3, 6, 10, 14, 15].includes(beat)) this.timbal(when, beat === 15);
    this.percussion(when, beat % 2 ? .05 : .032, beat % 2 ? 6500 : 4300, .045);
    if ([2, 5, 7, 10, 13, 15].includes(beat)) this.percussion(when, .12, 1750, .075);
    if ([1, 4, 7, 9, 12, 15].includes(beat)) this.bell(when, [4, 9, 15].includes(beat));
    if ([0, 3, 6, 8, 11, 14].includes(beat)) {
      const pitch = chord.bass * ([6, 14].includes(beat) ? 1.5 : beat === 11 ? 2 : 1);
      this.note(pitch, when, beat === 0 || beat === 8 ? .26 : .17, .25, 'triangle');
      this.note(pitch * 2, when, .09, .023, 'sawtooth');
    }
    if ([2, 6, 10, 14].includes(beat)) {
      for (const pitch of chord.tones) this.note(pitch, when, .075, .028, 'triangle');
    }
    const motifs = [
      [659.25, 783.99, 880, 659.25, 523.25, 659.25],
      [698.46, 880, 1046.50, 880, 698.46, 659.25],
      [783.99, 987.77, 1046.50, 783.99, 659.25, 783.99],
      [739.99, 987.77, 1174.66, 987.77, 783.99, 659.25]
    ];
    const leadSteps = [0, 3, 5, 8, 11, 14];
    const leadIndex = leadSteps.indexOf(beat);
    if (leadIndex >= 0) this.horn(motifs[bar][leadIndex], when, [0, 8].includes(beat) ? .23 : .14);
    if (beat === 12 && bar === 3) this.horn(1318.51, when, .22);
  }
  play() {
    this.ctx.resume().catch(() => {});
    if (this.timer !== null) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(.27, this.ctx.currentTime, .08);
    this.nextTime = this.ctx.currentTime + .06;
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }
  schedule() {
    if (this.timer === null) return;
    while (this.nextTime < this.ctx.currentTime + .15) {
      this.scheduleStep(this.step++, this.nextTime);
      this.nextTime += this.stepTime;
    }
  }
  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(.0001, this.ctx.currentTime, .045);
  }
};

// Web Audio API Synthesizer for UI audio effects, background music, and haptic feedback

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgMusicEnabled: boolean = true;
  private soundEffectsEnabled: boolean = true;
  private hapticEnabled: boolean = true;

  private bgOsc1: OscillatorNode | null = null;
  private bgOsc2: OscillatorNode | null = null;
  private bgGainNode: GainNode | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBgMusic();
    } else if (this.bgMusicEnabled) {
      this.startBgMusic();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setSoundEffectsEnabled(enabled: boolean) {
    this.soundEffectsEnabled = enabled;
  }

  public getSoundEffectsEnabled(): boolean {
    return this.soundEffectsEnabled;
  }

  public setHapticEnabled(enabled: boolean) {
    this.hapticEnabled = enabled;
  }

  public getHapticEnabled(): boolean {
    return this.hapticEnabled;
  }

  public setBgMusicEnabled(enabled: boolean) {
    this.bgMusicEnabled = enabled;
    if (enabled && !this.isMuted) {
      this.startBgMusic();
    } else {
      this.stopBgMusic();
    }
  }

  public getBgMusicEnabled(): boolean {
    return this.bgMusicEnabled;
  }

  public triggerHaptic(duration: number | number[] = 30) {
    if (this.hapticEnabled && typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch (e) {
        // Haptics not supported or blocked
      }
    }
  }

  public startBgMusic() {
    if (!this.bgMusicEnabled || this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.bgOsc1) return; // Already playing

      const now = this.ctx.currentTime;
      this.bgOsc1 = this.ctx.createOscillator();
      this.bgOsc2 = this.ctx.createOscillator();
      this.bgGainNode = this.ctx.createGain();

      this.bgOsc1.type = 'sine';
      this.bgOsc1.frequency.setValueAtTime(130.81, now); // C3 chord tone

      this.bgOsc2.type = 'triangle';
      this.bgOsc2.frequency.setValueAtTime(196.00, now); // G3 chord tone

      // Soft background volume
      this.bgGainNode.gain.setValueAtTime(0.015, now);

      this.bgOsc1.connect(this.bgGainNode);
      this.bgOsc2.connect(this.bgGainNode);
      this.bgGainNode.connect(this.ctx.destination);

      this.bgOsc1.start(now);
      this.bgOsc2.start(now);
    } catch (e) {
      console.warn('BG music playback error', e);
    }
  }

  public stopBgMusic() {
    try {
      if (this.bgOsc1) {
        this.bgOsc1.stop();
        this.bgOsc1.disconnect();
        this.bgOsc1 = null;
      }
      if (this.bgOsc2) {
        this.bgOsc2.stop();
        this.bgOsc2.disconnect();
        this.bgOsc2 = null;
      }
      if (this.bgGainNode) {
        this.bgGainNode.disconnect();
        this.bgGainNode = null;
      }
    } catch (e) {
      console.warn('BG music stop error', e);
    }
  }

  public playClick() {
    this.triggerHaptic(15);
    if (this.isMuted || !this.soundEffectsEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  public playCoin() {
    this.triggerHaptic([30, 40, 50]);
    if (this.isMuted || !this.soundEffectsEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      osc2.frequency.setValueAtTime(1975.53, now);
      osc2.frequency.setValueAtTime(2637.02, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  public playWinFanfare() {
    this.triggerHaptic([50, 50, 100, 150]);
    if (this.isMuted || !this.soundEffectsEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.2, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  public playCountdownTick() {
    this.triggerHaptic(10);
    if (this.isMuted || !this.soundEffectsEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  public playSpinWhoosh() {
    this.triggerHaptic(20);
    if (this.isMuted || !this.soundEffectsEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  public playBallClick() {
    this.triggerHaptic(15);
    if (this.isMuted || !this.soundEffectsEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.015);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.015);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  public playCheer() {
    this.triggerHaptic([40, 60, 80, 100]);
    if (this.isMuted || !this.soundEffectsEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.15, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.5);
      });
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  public playSpinTick() {
    this.triggerHaptic(10);
    if (this.isMuted || !this.soundEffectsEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.02);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }
}

export const soundFx = new SoundManager();

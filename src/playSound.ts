/**
 * Define sound names independently to keep audio logic decoupled from game rules.
 */
export type SoundEffect = 
  | 'roll' 
  | 'mighty' 
  | 'acrobatics' 
  | 'metamorph' 
  | 'win' 
  | 'lose'
  | 'dungeon_progress' 
  | 'attribute_gain';

/**
 * Manages the Web Audio API context and sound generation.
 */
class SoundManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {}

  /**
   * Lazily initializes the AudioContext.
   * Browsers require a user interaction before an AudioContext can run.
   */
  private getContext(): AudioContext {
    if (!this.audioContext) {
      // Create AudioContext only when needed
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }

    // Ensure context is running (it might be suspended by default)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Plays a sound effect by name.
   */
  public play(sound: SoundEffect): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();

      switch (sound) {
        case 'roll':
          this.playRoll(ctx);
          break;
        case 'mighty':
          this.playMighty(ctx);
          break;
        case 'acrobatics':
          this.playAcrobatics(ctx);
          break;
        case 'metamorph':
          this.playMetamorph(ctx);
          break;
        case 'win':
          this.playWin(ctx);
          break;
        case 'lose':
          this.playLose(ctx);
          break;
        case 'dungeon_progress':
          this.playDungeonProgress(ctx);
          break;
        case 'attribute_gain':
          this.playAttributeGain(ctx);
          break;
      }
    } catch (e) {
      console.error('Failed to play sound:', e);
    }
  }

  /**
   * Generates a noise-like sound for dice rolling.
   * Refined to be lighter and crisper (shaking/clicking).
   */
  private playRoll(ctx: AudioContext): void {
    const duration = 0.2; // Short duration for a crisp sound
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to remove low rumble and keep high frequencies (Highpass)
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000; // High frequency for "click" or "shake"

    // Gain envelope for percussive effect
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
  }

  /**
   * Generates a strong, low-frequency sound (square wave).
   */
  private playMighty(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(110, ctx.currentTime); // Low A2
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.3); // Drop pitch

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  /**
   * Generates a quick, high-pitched sweep (sawtooth).
   */
  private playAcrobatics(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  /**
   * Generates a modulating or wobbling sound (magic feel).
   */
  private playMetamorph(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Carrier
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);

    // LFO for vibrato
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 15; // 15Hz wobble

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 50; // Depth of modulation

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    lfo.start();
    osc.stop(ctx.currentTime + 0.6);
    lfo.stop(ctx.currentTime + 0.6);
  }

  /**
   * Generates a short victory jingle (major chord arpeggio).
   */
  private playWin(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major: C4, E4, G4, C5
    const duration = 0.15;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = now + index * 0.1;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * Generates a "Game Over" style sound (descending slide).
   */
  private playLose(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  /**
   * Generates a heavy, deep thud or descending tone.
   * Refined to be more audible.
   */
  private playDungeonProgress(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Use square wave for better audibility
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  /**
   * Generates a short, high-pitched "ding" or ascending tone.
   */
  private playAttributeGain(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }
}

// Singleton instance
const soundManager = new SoundManager();

/**
 * Triggers audio playback for a specific sound effect.
 * @param sound - The ID of the sound to play.
 */
export function playSound(sound: SoundEffect): void {
  soundManager.play(sound);
}

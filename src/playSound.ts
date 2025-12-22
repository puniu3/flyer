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
   */
  private getContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }

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
   * Generates a sound like a die rolling on a ceramic surface.
   * Uses high-frequency bandpass noise with multiple impacts.
   */
  private playRoll(ctx: AudioContext): void {
    // Helper function to create a single "clink" sound
    const playClick = (timeOffset: number, volume: number) => {
      const duration = 0.05;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // White noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to simulate hard material resonance (ceramic)
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2500 + Math.random() * 500; // High pitch around 2.5kHz - 3kHz
      filter.Q.value = 5; // Resonant peak

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume, ctx.currentTime + timeOffset);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + duration);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      noise.start(ctx.currentTime + timeOffset);
    };

    // Trigger multiple clicks to simulate rolling/bouncing
    playClick(0, 0.5);
    playClick(0.06, 0.4);
    playClick(0.13, 0.2);
  }

  /**
   * Generates a heroic, brass-like sound (Sawtooth wave).
   * Positive and strong feel.
   */
  private playMighty(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Sawtooth creates a buzzy, brass-like timbre
    osc.type = 'sawtooth';
    // A perfect 5th power chord interval simulation (rapid arpeggio effect or just strong root)
    // Here we use a stable strong note (C3 -> 130.81Hz or G2 -> 98Hz)
    osc.frequency.setValueAtTime(130.81, ctx.currentTime); 
    
    // Lowpass filter envelope to mimic "blowing" into a horn (Wah effect)
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.1); // Open filter quickly
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.6); // Close filter slowly

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6); // Decay

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
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
    lfo.frequency.value = 15;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 50;

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
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
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
   * Generates a positive, ascending sound indicating forward movement.
   * Replaces the heavy thud with a pleasant "step forward" chime.
   */
  private playDungeonProgress(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // Play two notes in quick succession (Interval of a Major 3rd or 4th)
    // Giving a feeling of "Upward" movement
    const notes = [440, 554.37]; // A4 -> C#5 (Major 3rd interval)

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle'; // Triangle is softer/cleaner than square
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      // Short envelope
      gainNode.gain.setValueAtTime(0, now + i * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
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

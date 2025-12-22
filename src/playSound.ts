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
  | 'attribute_gain'
  | 'hold';

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
        case 'hold':
          this.playHold(ctx);
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
   * Generates a majestic fanfare for a major victory.
   * Simulates a brass section with a triumphant melody and sustained chord.
   * Sequence: Rapid ascending arpeggio -> Sustained Grand Chord.
   */
  private playWin(ctx: AudioContext): void {
    const now = ctx.currentTime;
    
    // Helper to play a brass-like note
    // freq: frequency in Hz
    // t: start time relative to 'now'
    // dur: duration in seconds
    // vol: volume level (0.0 - 1.0)
    const playBrass = (freq: number, t: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Sawtooth wave approximates brass instruments
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      // Lowpass filter envelope for "blaring" horn effect
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, t);
      filter.frequency.linearRampToValueAtTime(3000, t + 0.1); // Open up bright
      filter.frequency.linearRampToValueAtTime(1500, t + dur); // Settle down

      // ADSR Envelope (Attack, Decay, Sustain, Release)
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(vol, t + 0.05);       // Attack
      gainNode.gain.linearRampToValueAtTime(vol * 0.8, t + 0.2);  // Decay
      gainNode.gain.setValueAtTime(vol * 0.8, t + dur - 0.5);     // Sustain
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + dur); // Release

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + dur + 0.1);
    };

    // --- Fanfare Composition (C Major) ---
    
    // Part 1: The Build-up (Triplet / Arpeggio up)
    // C4, E4, G4, C5 rapidly
    playBrass(261.63, now + 0.00, 0.3, 0.2); // C4
    playBrass(329.63, now + 0.15, 0.3, 0.2); // E4
    playBrass(392.00, now + 0.30, 0.3, 0.2); // G4
    
    // Part 2: The Arrival (Brief pause or leading note)
    playBrass(392.00, now + 0.45, 0.2, 0.2); // G4 (Short lead-in)

    // Part 3: The Grand Finale (Long Chord)
    // Plays C5 (Root), E5 (Major 3rd), and C3 (Bass) simultaneously
    const chordStart = now + 0.65;
    const chordDuration = 3.5;

    // Main Melody High Note (C5) - slightly louder
    playBrass(523.25, chordStart, chordDuration, 0.25); 
    
    // Harmony High (E5)
    playBrass(659.25, chordStart, chordDuration, 0.15); 
    
    // Harmony Low (G4)
    playBrass(392.00, chordStart, chordDuration, 0.15);

    // Bass Foundation (C3) - Adds weight/epic feel
    playBrass(130.81, chordStart, chordDuration, 0.3);
  }

  /**
   * Generates a dramatic "Game Over" sound.
   * Uses a dissonant tritone interval sliding down with a heavy low-pass filter
   * to create a sense of doom and failure.
   */
  private playLose(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const duration = 2.0;

    // Create two oscillators for a dissonant interval (Tritone: Devil's interval)
    // Base note: C3 (approx 130Hz) and F#3 (approx 185Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Oscillator 1: Main body (Sawtooth for grit)
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130.81, now); 
    osc1.frequency.exponentialRampToValueAtTime(40, now + duration); // Deep slide down

    // Oscillator 2: Dissonance
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(185.00, now); 
    osc2.frequency.exponentialRampToValueAtTime(55, now + duration); // Slide down parallel

    // Lowpass filter to darken the sound over time
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now); // Start somewhat bright
    filter.frequency.exponentialRampToValueAtTime(50, now + duration); // Close down to silence

    // Volume Envelope
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Connections
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Start and Stop
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * Generates a positive, ascending sound indicating forward movement.
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

  /**
   * Generates a short, subtle blip for UI selection (holding/locking a die).
   * Soft sine wave, high pitch, very short duration.
   */
  private playHold(ctx: AudioContext): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime); // High pitch "blip"

    // Very short, percussive envelope
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime); // Quiet volume
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
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

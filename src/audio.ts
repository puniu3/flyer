export const CUES = [
  "pickup",
  "place",
  "roll",
  "skill",
  "gather",
  "victory",
] as const;
export type Cue = (typeof CUES)[number];

export class TableAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private analyser?: AnalyserNode;
  private raw = new Map<Cue, ArrayBuffer>();
  private buffers = new Map<Cue, AudioBuffer>();
  private sources = new Set<AudioBufferSourceNode>();
  private loading?: Promise<void>;
  private decoding?: Promise<void>;
  private epoch = 0;
  private count = 0;
  private lastCue: Cue | null = null;
  private error: string | null = null;
  muted = false;
  volume = 0.55;

  constructor(private storagePrefix = "flyer:v2") {
    try {
      this.muted =
        localStorage.getItem(`${this.storagePrefix}:muted`) === "true";
    } catch {}
  }

  load() {
    this.loading ??= Promise.all(
      CUES.map(async (cue) => {
        const response = await fetch(
          `${import.meta.env.BASE_URL}assets/audio/${cue}.wav`,
        );
        if (!response.ok) throw new Error(`Audio unavailable: ${cue}`);
        this.raw.set(cue, await response.arrayBuffer());
      }),
    ).then(() => undefined);
    return this.loading;
  }

  async unlock() {
    try {
      if (this.muted) return;
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.volume;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.1;
        this.analyser = this.context.createAnalyser();
        this.analyser.fftSize = 1024;
        this.master
          .connect(limiter)
          .connect(this.analyser)
          .connect(this.context.destination);
      }
      if (this.context.state !== "running") await this.context.resume();
      await this.load();
      this.decoding ??= Promise.all(
        [...this.raw].map(async ([cue, bytes]) => {
          this.buffers.set(
            cue,
            await this.context!.decodeAudioData(bytes.slice(0)),
          );
        }),
      ).then(() => undefined);
      await this.decoding;
    } catch (error) {
      this.error = String(error);
    }
  }

  async play(cue: Cue, gainValue = 1, pan = 0, rate = 1) {
    const epoch = this.epoch;
    await this.unlock();
    const context = this.context;
    const buffer = this.buffers.get(cue);
    if (
      epoch !== this.epoch ||
      this.muted ||
      !context ||
      context.state !== "running" ||
      !buffer ||
      !this.master
    )
      return;
    if (this.sources.size >= 6) this.sources.values().next().value?.stop();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = context.createGain();
    gain.gain.value = gainValue;
    const stereo = context.createStereoPanner();
    stereo.pan.value = Math.max(-0.45, Math.min(0.45, pan));
    source.connect(gain).connect(stereo).connect(this.master);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      gain.disconnect();
      stereo.disconnect();
    };
    this.count++;
    this.lastCue = cue;
    source.start();
  }

  stop() {
    this.epoch++;
    for (const source of this.sources) source.stop();
    this.sources.clear();
  }

  async setMuted(value: boolean) {
    this.muted = value;
    this.stop();
    try {
      localStorage.setItem(`${this.storagePrefix}:muted`, String(value));
    } catch {}
    if (value) await this.context?.suspend();
    else await this.unlock();
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        this.volume,
        this.context.currentTime,
        0.015,
      );
    try {
      localStorage.setItem(`${this.storagePrefix}:volume`, String(this.volume));
    } catch {}
  }

  async pause() {
    this.stop();
    await this.context?.suspend();
  }
  rms() {
    if (!this.analyser || this.context?.state !== "running") return 0;
    const values = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(values);
    return Math.sqrt(
      values.reduce((sum, value) => sum + value * value, 0) / values.length,
    );
  }
  diagnostics() {
    return {
      state: this.context?.state ?? "uninitialized",
      count: this.count,
      lastCue: this.lastCue,
      muted: this.muted,
      volume: this.volume,
      error: this.error,
      rms: this.rms(),
    };
  }
}

import "./magic-demo.css";
const status = document.querySelector<HTMLElement>("#status")!;
const volume = document.querySelector<HTMLInputElement>("#volume")!;
let context: AudioContext | undefined;
let gain: GainNode | undefined;
let analyser: AnalyserNode | undefined;
let source: AudioBufferSourceNode | undefined;
let generation = 0;
const buffers = new Map<string, AudioBuffer>();
const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-cue]")];
function stop() {
  generation++;
  source?.stop(); source = undefined;
  for (const button of buttons) { button.closest("article")?.classList.remove("playing"); button.setAttribute("aria-pressed", "false"); }
}
for (const button of buttons) button.addEventListener("click", async () => {
  stop();
  const token = generation;
  const cue = button.dataset.cue!;
  status.textContent = `${cue === "current" ? "現行" : cue.toUpperCase()} を準備中…`;
  try {
    if (!context) {
      context = new AudioContext();
      gain = context.createGain();
      gain.gain.value = Number(volume.value) * .7;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = .003; limiter.release.value = .1;
      analyser = context.createAnalyser();
      gain.connect(limiter).connect(analyser).connect(context.destination);
    }
    await context.resume();
    if (!buffers.has(cue)) {
      const path = cue === "current" ? "magic.wav" : `magic-candidates/${cue}.wav?v=tilun-271`;
      const response = await fetch(`${import.meta.env.BASE_URL}assets/audio/${path}`);
      if (!response.ok) throw new Error(String(response.status));
      buffers.set(cue, await context.decodeAudioData(await response.arrayBuffer()));
    }
    if (token !== generation || document.hidden) return;
    const node = context.createBufferSource();
    node.buffer = buffers.get(cue)!;
    node.connect(gain!);
    node.onended = () => { node.disconnect(); if (source === node) { source = undefined; button.closest("article")?.classList.remove("playing"); button.setAttribute("aria-pressed", "false"); status.textContent = `${cue === "current" ? "現行" : cue.toUpperCase()} · ${node.buffer!.duration.toFixed(2)}秒`; } };
    source = node;
    button.setAttribute("aria-pressed", "true"); button.closest("article")?.classList.add("playing");
    status.textContent = `${cue === "current" ? "現行" : cue.toUpperCase()} を再生中`;
    node.start();
  } catch (error) { if (token === generation) status.textContent = `音を読み込めませんでした: ${String(error)}`; }
});
volume.addEventListener("input", () => { if (gain && context) gain.gain.setTargetAtTime(Number(volume.value) * .7, context.currentTime, .015); });
document.querySelector("#stop")!.addEventListener("click", () => { stop(); status.textContent = "停止しました。"; });
document.addEventListener("visibilitychange", () => { if (document.hidden) { stop(); void context?.suspend(); } });
if (new URLSearchParams(location.search).has("check")) Object.assign(window, { __magicPreview: {
  active: () => Boolean(source),
  rms: () => { if (!analyser || context?.state !== "running") return 0; const data = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(data); return Math.sqrt(data.reduce((sum, x) => sum + x*x, 0) / data.length); },
} });

import { TableAudio, CUES } from "./audio";
import "./style.css";
const audio = new TableAudio("flyer:audition");
document.querySelector("#shelf")!.innerHTML =
  `<div style="max-width:600px;margin:40px auto;padding:24px"><h1>Flyer Dungeon · Foley</h1><p>木・厚紙・フェルトと勝利ファンファーレ</p><label>音量 <input id="volume" type="range" min="0" max="1" step=".01" value="${audio.volume}"></label><div style="display:flex;gap:12px;flex-wrap:wrap;margin:24px 0">${CUES.map((c) => `<button data-cue="${c}">${c}</button>`).join("")}</div><button id="stop">停止</button><p id="message"></p><a href="./" style="color:#e9c584">ゲームに戻る</a></div>`;
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-cue]"))
  b.onclick = async () => {
    audio.stop();
    await audio.setMuted(false);
    await audio.play(b.dataset.cue as (typeof CUES)[number]);
    document.querySelector("#message")!.textContent =
      audio.diagnostics().error ?? b.dataset.cue!;
  };
document.querySelector<HTMLInputElement>("#volume")!.oninput = (e) =>
  audio.setVolume(Number((e.target as HTMLInputElement).value));
document.querySelector<HTMLButtonElement>("#stop")!.onclick = () =>
  audio.stop();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) void audio.pause();
});

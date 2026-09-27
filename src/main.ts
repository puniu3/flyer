import "./style.css";
import { getView } from "./rules";
import { DungeonScene, DEFAULT_CAMERA } from "./scene";
import { TableAudio } from "./audio";
import { Session } from "./session";
import { slots, GROUPS, SKILLS, SKILL_CARD, SHEET_TOP, markerX } from "./layout";
import { createTranslator } from "./i18n";
import { loadCamera, readPreference, savePreference } from "./preferences";
import type { CategoryId, SkillId, PlayerAction, GameState } from "./types";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<main class="stage" id="stage"><div class="table-ui" id="table-ui"></div><nav class="top-actions"><button id="sound" aria-label="音声切替"></button><button id="help" aria-label="遊び方">?</button></nav><button class="roll" id="roll" disabled><span id="roll-label">Roll</span><small id="roll-remaining"></small></button><div class="loading" id="loading">卓上を準備しています…</div></main>
<dialog id="settings"><button class="close" data-close>×</button><h2>卓上の調整</h2><label class="settings-row">言語 / Language<select id="language"><option value="ja">日本語</option><option value="en">English</option><option value="zh">简体中文</option><option value="zh-TW">繁體中文</option><option value="ko">한국어</option><option value="de">Deutsch</option><option value="fr">Français</option><option value="es">Español</option></select></label><label class="settings-row">音量<input id="volume" type="range" min="0" max="1" step=".01"></label><label class="settings-row">画角<input id="fov" type="range" min="10" max="45" step="1"><output id="fov-value"></output></label><label class="settings-row">俯角<input id="elevation" type="range" min="25" max="75" step="1"><output id="elevation-value"></output></label><label class="settings-row">距離<input id="distance" type="range" min=".6" max="1.8" step=".02"><output id="distance-value"></output></label><div class="dialog-actions"><button id="save-camera">設定を保存</button><button id="default-camera">標準に戻す</button><button id="export">プレイログ</button><button id="restart">最初から</button></div><p class="sound-status" id="audio-status"></p></dialog>
<dialog id="guide"><button class="close" data-close>×</button><div id="guide-content"></div><div class="dialog-actions"><button id="settings-open">調整</button></div></dialog>
<dialog id="result"><h2 id="result-title"></h2><p id="result-copy"></p><button id="again">もう一度遊ぶ</button></dialog>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let locale = readPreference("language", "ja");
let t = createTranslator(locale);
let session = new Session(crypto.getRandomValues(new Uint32Array(1))[0]);
let held = new Set<number>();
let selectedSkill: SkillId | null = null;
let busy = false;
let ready = false;
let epoch = 0;
let shownResult = false;
const audio = new TableAudio();
const scene = new DungeonScene(el("stage"));
let camera = loadCamera();
scene.configure(camera);
const ui = el("table-ui");
const categoryButtons = new Map<CategoryId, HTMLButtonElement>();
const skillButtons: HTMLButtonElement[] = [];
const diceButtons: HTMLButtonElement[] = [];
function button(className: string, id: string) {
  const b = document.createElement("button");
  b.className = `table-label ${className}`;
  b.dataset.id = id;
  ui.append(b);
  b.addEventListener("click", () => tap(id));
  return b;
}
for (const s of slots) {
  const b = button("category", `category:${s.id}`);
  categoryButtons.set(s.id, b);
}
GROUPS.forEach((g, i) => {
  const b = button("skill-label", `skill:${i}`);
  skillButtons.push(b);
  b.addEventListener("focus", render);
  b.addEventListener("blur", render);
});
for (let i = 0; i < 5; i++) diceButtons.push(button("die-hit", `die:${i}`));
function place(element: HTMLElement, x: number, y: number, z: number) {
  const p = scene.project(x, y, z);
  element.style.left = `${p.x}px`;
  element.style.top = `${p.y}px`;
  element.hidden = !p.visible;
}
function project() {
  for (const s of scene.layout.slots) {
    const b = categoryButtons.get(s.id)!;
    place(
      b,
      markerX(s),
      session.state.categories[s.id] ? SHEET_TOP + 0.21 : SHEET_TOP + 0.004,
      s.z,
    );
    const front = scene.project(s.x, SHEET_TOP, s.z + 0.38),
      back = scene.project(s.x, SHEET_TOP, s.z - 0.38);
    b.style.height = `${Math.min(40, Math.max(10, front.y - back.y))}px`;
    b.style.minHeight = "0";
  }
  GROUPS.forEach((_, i) => {
    const { x: centerX, z } = scene.layout.skillPositions[i];
    const x = centerX + SKILL_CARD.offsetX;
    place(skillButtons[i], x, SKILL_CARD.top, z);
    const left = scene.project(x - SKILL_CARD.width / 2, SKILL_CARD.top, z);
    const right = scene.project(x + SKILL_CARD.width / 2, SKILL_CARD.top, z);
    const front = scene.project(x, SKILL_CARD.top, z + SKILL_CARD.depth / 2);
    const back = scene.project(x, SKILL_CARD.top, z - SKILL_CARD.depth / 2);
    skillButtons[i].style.width = `${right.x - left.x}px`;
    skillButtons[i].style.height = `${front.y - back.y}px`;
  });
  const roll = el("roll");
  const dock = scene.rollDock;
  if (dock) {
    Object.assign(roll.style, { left: `${dock.x}px`, top: `${dock.y}px`, right: "auto", bottom: "auto", width: `${dock.size}px`, height: `${dock.size}px`, transform: "translate(-50%, -50%)" });
  } else roll.removeAttribute("style");
  diceButtons.forEach((b, i) => {
    const p = scene.diePosition(i);
    place(b, p.x, p.y + 0.3, p.z);
  });
}
scene.setOverlay(project);
scene.onTap = tap;
scene.onError = (message) => {
  el("loading").textContent = message;
  el("loading").hidden = !message;
};
scene.onContact = (kind, x) => {
  if (kind !== "die")
    void audio.play(kind === "skill" ? "skill" : "place", 0.8, x / 18);
};
function persistLog() {
  try {
    localStorage.setItem("flyer:v2:last-play", JSON.stringify(session.dump()));
  } catch {}
}
function render() {
  const view = getView(session.state);
  const dice = view.dice;
  const remaining = dice.length
    ? view.rolls.max - view.rolls.current
    : view.rolls.max - 1;
  el("roll-label").textContent = dice.length ? "Reroll" : "Roll";
  el("roll-remaining").textContent = dice.length ? `${remaining}/2` : "";
  el("roll").setAttribute(
    "aria-label",
    dice.length ? `Reroll ${remaining}/2` : "Roll",
  );
  el("roll").setAttribute("aria-busy", String(busy));
  (el("roll") as HTMLButtonElement).disabled =
    !ready || busy || !view.rolls.canRoll;
  for (const s of view.categories) {
    const b = categoryButtons.get(s.id)!;
    b.disabled = busy || !s.isSelectable;
    b.className = `table-label category${s.isSelectable && !busy ? " available" : ""}${s.isChecked ? " checked" : ""}`;
    b.textContent = "";
    b.setAttribute(
      "aria-label",
      `${t(`cat_${s.id}`)}${s.isChecked ? (locale === "ja" ? " 達成済み" : " completed") : ""}`,
    );
    b.title = t(`cat_${s.id}`);
  }
  GROUPS.forEach((g, i) => {
    const id = SKILLS[g];
    const skill = view.skills[id];
    const b = skillButtons[i];
    b.disabled =
      busy ||
      !dice.length ||
      view.gameStatus !== "playing" ||
      skill.status !== "available";
    b.classList.toggle("locked", skill.status === "locked");
    b.classList.toggle("active", selectedSkill === id);
    b.setAttribute("aria-pressed", String(selectedSkill === id));
    const title = t(`skill_name_${id}`);
    const description = skill.status === "used"
      ? (locale === "ja" ? "使用済み" : "USED")
      : t(`skill_desc_${id}`);
    b.setAttribute("aria-label", `${title}: ${description}`);
    scene.setSkillCard(i, title, description, skill.status, selectedSkill === id || b.matches(":focus-visible"));
  });
  diceButtons.forEach((b, i) => {
    b.disabled =
      busy ||
      !dice.length ||
      view.gameStatus !== "playing" ||
      (!view.rolls.canRoll && !selectedSkill);
    b.classList.toggle("held", held.has(i) && view.rolls.canRoll);
    b.setAttribute(
      "aria-label",
      `${locale === "ja" ? "ダイス" : "Die"} ${i + 1}: ${dice[i] ?? "—"} ${held.has(i) && view.rolls.canRoll ? t("label_held") : ""}`,
    );
    b.setAttribute("aria-pressed", String(held.has(i) && view.rolls.canRoll));
  });
  el("sound").innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/>${audio.muted ? '<path d="m16 9 6 6m0-6-6 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}</svg>`;
  el("sound").setAttribute("aria-pressed", String(!audio.muted));
  el("sound").setAttribute(
    "aria-label",
    locale === "ja"
      ? `音 ${audio.muted ? "OFF" : "ON"}`
      : `Sound ${audio.muted ? "off" : "on"}`,
  );
  el("settings-open").textContent = locale === "ja" ? "調整" : "Settings";
  project();
  scene.draw();
}
function settle(token: number) {
  if (token !== epoch) return;
  busy = false;
  scene.sync(getView(session.state), held);
  render();
  persistLog();
  if (session.state.status !== "playing" && !shownResult) {
    shownResult = true;
    const won = session.state.status === "won";
    el("result").setAttribute("aria-label", won ? "Victory" : "Game over");
    el("result-title").textContent = t(
      won ? "status_won" : "status_lost",
    ).replace(/[🎉💀]/gu, "");
    el("result-copy").textContent =
      locale === "ja"
        ? won
          ? "地下5階を踏破しました。"
          : "残る技能を使っても、達成できる役がありません。"
        : won
          ? "The fifth floor is complete."
          : "No category can be reached with the remaining skills.";
    el("again").textContent = t("btn_play_again").replace(/\s*↺/g, "");
    el<HTMLDialogElement>("result").showModal();
    if (!document.hidden)
      void audio.play(won ? "victory" : "gather", 0.6, 0, won ? 1 : 0.85);
  }
}
function dispatch(action: PlayerAction) {
  session.dispatch(action);
  persistLog();
}
function tap(id: string) {
  if (!ready || busy) return;
  void audio.unlock();
  const view = getView(session.state);
  if (id === "empty") {
    selectedSkill = null;
    render();
    return;
  }
  const [kind, value] = id.split(":");
  if (kind === "die") {
    const i = Number(value);
    if (!view.dice.length || view.gameStatus !== "playing") return;
    if (selectedSkill) {
      const skillId = selectedSkill;
      selectedSkill = null;
      dispatch({ type: "use_skill", skillId, targetDieIndex: i });
      busy = true;
      const token = epoch;
      render();
      scene.skill(
        i,
        session.state.dice[i],
        GROUPS.findIndex((g) => SKILLS[g] === skillId),
        () => settle(token),
      );
    } else {
      if (!view.rolls.canRoll) return;
      held.has(i) ? held.delete(i) : held.add(i);
      void audio.play("pickup", 0.6, scene.diePosition(i).x / 18);
      scene.sync(view, held);
      render();
    }
  } else if (kind === "skill") {
    const skill = SKILLS[GROUPS[Number(value)]];
    if (
      !skill ||
      !view.dice.length ||
      view.gameStatus !== "playing" ||
      view.skills[skill].status !== "available"
    )
      return;
    selectedSkill = selectedSkill === skill ? null : skill;
    void audio.play("pickup", 0.4);
    render();
  } else if (kind === "category") {
    const categoryId = value as CategoryId;
    if (!view.categories.find((c) => c.id === categoryId)?.isSelectable) return;
    selectedSkill = null;
    dispatch({ type: "select_category", categoryId });
    held.clear();
    busy = true;
    const token = epoch;
    render();
    scene.place(categoryId, getView(session.state), () => settle(token));
  }
}
el("roll").addEventListener("click", () => {
  if (!ready || busy || !getView(session.state).rolls.canRoll) return;
  const indices = session.state.dice.length
    ? [0, 1, 2, 3, 4].filter((i) => !held.has(i))
    : [0, 1, 2, 3, 4];
  selectedSkill = null;
  dispatch({ type: "roll_dice", indexesToReroll: indices });
  busy = true;
  const token = epoch;
  render();
  if (indices.length)
    void audio.play("roll", Math.max(0.35, indices.length / 5));
  scene.roll(
    session.state.dice,
    indices,
    getView(session.state).rolls.canRoll,
    () => settle(token),
  );
});
function restart() {
  epoch++;
  audio.stop();
  scene.finish(false);
  session = new Session(crypto.getRandomValues(new Uint32Array(1))[0]);
  held.clear();
  selectedSkill = null;
  busy = false;
  shownResult = false;
  for (const d of document.querySelectorAll("dialog")) d.close();
  scene.sync(getView(session.state), held);
  render();
  persistLog();
  void audio.play("gather", 0.65);
}
el("again").addEventListener("click", restart);
el("restart").addEventListener("click", restart);
el("sound").addEventListener("click", async () => {
  await audio.setMuted(!audio.muted);
  render();
});
el("settings-open").addEventListener("click", () => {
  el<HTMLDialogElement>("guide").close();
  el<HTMLDialogElement>("settings").showModal();
  el("audio-status").textContent = audio.diagnostics().error ?? "";
});
for (const b of document.querySelectorAll("[data-close]"))
  b.addEventListener("click", () => b.closest("dialog")?.close());
for (const d of document.querySelectorAll("dialog"))
  d.addEventListener("click", (e) => {
    if (d.id === "result") return;
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
el("result").addEventListener("cancel", (e) => e.preventDefault());
el("help").addEventListener("click", () => {
  el("guide-content").innerHTML =
    `<h2>${t("guide_title")}</h2>${["roll", "skill", "write"].map((section, i) => `<h3>${i + 1}. ${t(`guide_${section}_title`)}</h3><ul>${[1, 2, ...(section === "skill" ? [] : [3])].map((n) => `<li>${t(`guide_${section}_${n}`)}</li>`).join("")}</ul>`).join("")}`;
  const clarification = document.createElement("p");
  clarification.textContent =
    locale === "ja"
      ? "3投目の後も、残る技能で役を作れる間は続けられます。"
      : "After the third roll, play continues while remaining skills can still produce a valid category.";
  el("guide-content").append(clarification);
  el<HTMLDialogElement>("guide").showModal();
});
el<HTMLSelectElement>("language").value = locale;
el("language").addEventListener("change", () => {
  locale = el<HTMLSelectElement>("language").value;
  t = createTranslator(locale);
  document.documentElement.lang = locale;
  savePreference("language", locale);
  render();
});
el<HTMLInputElement>("volume").value = String(audio.volume);
el("volume").addEventListener("input", () =>
  audio.setVolume(Number(el<HTMLInputElement>("volume").value)),
);
function cameraControls() {
  for (const key of ["fov", "elevation", "distance"] as const) {
    el<HTMLInputElement>(key).value = String(camera[key]);
    el(`${key}-value`).textContent =
      key === "distance" ? camera[key].toFixed(2) : `${camera[key]}°`;
  }
}
for (const key of ["fov", "elevation", "distance"] as const)
  el(key).addEventListener("input", () => {
    camera[key] = Number(el<HTMLInputElement>(key).value);
    scene.configure(camera);
    cameraControls();
  });
el("save-camera").addEventListener("click", () => {
  savePreference("camera", JSON.stringify(camera));
  el<HTMLDialogElement>("settings").close();
});
el("default-camera").addEventListener("click", () => {
  camera = { ...DEFAULT_CAMERA };
  scene.configure(camera);
  cameraControls();
});
cameraControls();
el("export").addEventListener("click", () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(session.dump(), null, 2)], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "flyer-play.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    selectedSkill = null;
    render();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    void audio.pause();
    scene.finish();
  } else render();
});
void audio.load().catch(() => {});
try {
  await scene.load();
  ready = true;
  scene.sync(getView(session.state), held);
  el("loading").hidden = true;
  render();
} catch (error) {
  el("loading").textContent =
    `読み込みに失敗しました。再読み込みしてください。 ${String(error)}`;
}
if (new URLSearchParams(location.search).has("check")) {
  Object.assign(window, {
    __flyer: {
      state: () => structuredClone(session.state),
      view: () => getView(session.state),
      log: () => session.dump(),
      diagnostics: () => scene.diagnostics(),
      audio: () => audio.diagnostics(),
      ready: () => ready && !busy,
      project: (x: number, y: number, z: number) => scene.project(x, y, z),
      tap,
      seed: (seed: number) => {
        epoch++;
        audio.stop();
        scene.finish(false);
        session = new Session(seed);
        held.clear();
        selectedSkill = null;
        busy = false;
        shownResult = false;
        scene.sync(getView(session.state), held);
        render();
      },
      fixture: (state: GameState) => {
        epoch++;
        audio.stop();
        scene.finish(false);
        session.state = structuredClone(state);
        held.clear();
        selectedSkill = null;
        busy = false;
        shownResult = false;
        scene.sync(getView(state), held);
        render();
      },
    },
  });
}

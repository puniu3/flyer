import "./style.css";
import { languages } from "./languages";
import { getView } from "./rules";
import { DungeonScene, DEFAULT_CAMERA } from "./scene";
import { TableAudio } from "./audio";
import { Session } from "./session";
import { slots, GROUPS, SKILLS, SKILL_CARD, SHEET_TOP, markerX } from "./layout";
import { translator, loadLocaleFont, fontFamily } from "./localization";
import { readPreference, savePreference } from "./preferences";
import type { CategoryId, SkillId, PlayerAction, GameState } from "./types";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<main class="stage" id="stage"><div class="table-ui" id="table-ui"></div><nav class="top-actions"><button id="sound" aria-label="音声切替"></button><button id="language-open" aria-label="言語 / Language" popovertarget="languages"></button><button id="help" aria-label="遊び方">?</button></nav><button class="roll" id="roll" disabled><span id="roll-label">Roll</span><small id="roll-remaining"></small></button><div class="loading" id="loading">卓上を準備しています…</div></main>
<div id="languages" popover="auto" aria-label="Language">${languages.map(([id, name]) => `<button data-language="${id}" lang="${id}">${name}</button>`).join("")}</div>
<dialog id="guide"><div id="guide-content"></div></dialog>
<dialog id="result"><h2 id="result-title"></h2><p id="result-copy"></p><button id="again">もう一度遊ぶ</button></dialog>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let locale = readPreference("language", "ja");
document.documentElement.lang = locale;
let t = translator(locale);
el("loading").textContent = t("loading");
el("roll-label").textContent = t("roll");
let session = new Session(crypto.getRandomValues(new Uint32Array(1))[0]);
let held = new Set<number>();
let selectedSkill: SkillId | null = null;
let busy = false;
let ready = false;
let epoch = 0;
let shownResult = false;
const audio = new TableAudio("flyer:v2", false);
const scene = new DungeonScene(el("stage"));
scene.configure(DEFAULT_CAMERA);
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
scene.onAbility = (groupIndex, x) => {
  void audio.play((["mighty", "acrobatics", "magic"] as const)[groupIndex], 0.7, x / 18);
};
scene.onContact = (kind, x) => {
  if (kind !== "die")
    void audio.play(kind === "skill" ? "skill" : "place", kind === "skill" ? 0.25 : 0.8, x / 18);
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
  el("roll-label").textContent = dice.length ? t("reroll") : t("roll");
  el("roll-remaining").textContent = dice.length ? `${remaining}/2` : "";
  el("roll").setAttribute(
    "aria-label",
    dice.length ? `${t("reroll")} ${remaining}/2` : t("roll"),
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
      `${t(`cat_${s.id}`)}${s.isChecked ? ` ${t("completed")}` : ""}`,
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
      ? t("used")
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
      `${t("die")} ${i + 1}: ${dice[i] ?? "—"} ${held.has(i) && view.rolls.canRoll ? t("label_held") : ""}`,
    );
    b.setAttribute("aria-pressed", String(held.has(i) && view.rolls.canRoll));
  });
  el("sound").innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/>${audio.muted ? '<path d="m16 9 6 6m0-6-6 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}</svg>`;
  el("sound").setAttribute("aria-pressed", String(!audio.muted));
  el("sound").setAttribute(
    "aria-label",
    `${t("sound")} ${audio.muted ? "OFF" : "ON"}`,
  );
  el("language-open").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>`;
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-language]"))
    b.setAttribute("aria-pressed", String(b.dataset.language === locale));
  el("help").setAttribute("aria-label", t("guide_title"));
  el("language-open").setAttribute("aria-label", t("language"));
  el("languages").setAttribute("aria-label", t("language"));
  scene.selectSkill(!busy && !document.hidden && view.gameStatus === "playing" ? selectedSkill : null);
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
    el("result").setAttribute("aria-label", t(won ? "status_won" : "status_lost"));
    el("result-title").textContent = t(
      won ? "status_won" : "status_lost",
    ).replace(/[🎉💀]/gu, "");
    el("result-copy").textContent = t(won ? "victory_copy" : "loss_copy");
    el("again").textContent = t("btn_play_again").replace(/\s*↺/g, "");
    el<HTMLDialogElement>("result").showModal();
    if (!document.hidden)
      void audio.play(won ? "victory" : "defeat", 0.6);
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
  scene.clearEffects();
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
el("sound").addEventListener("click", async () => {
  await audio.setMuted(!audio.muted);
  render();
});
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
  const credit = document.createElement("p");
  credit.className = "guide-credit";
  credit.textContent = "2026 Curiosity Inc.";
  const footer = document.createElement("footer");
  footer.className = "guide-footer";
  const variants = document.createElement("span");
  variants.className = "ui-links";
  variants.lang = "en";
  variants.innerHTML = '<a href="?ui=text">Text</a> / <a href="?ui=classic">Classic</a>';
  footer.append(credit, variants);
  el("guide-content").append(footer);
  el<HTMLDialogElement>("guide").showModal();
});
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-language]")) {
  b.addEventListener("click", async () => {
    const next = b.dataset.language!;
    await loadLocaleFont(next);
    locale = next;
    t = translator(locale);
    document.documentElement.lang = locale;
    document.documentElement.style.setProperty("--game-font", fontFamily(locale));
    scene.setLocale(locale);
    savePreference("language", locale);
    el("languages").hidePopover();
    el("language-open").focus();
    render();
  });
}
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
    scene.clearEffects();
  } else render();
});
void audio.load().catch(() => {});
try {
  el("loading").textContent = t("loading");
  await loadLocaleFont(locale);
  document.documentElement.style.setProperty("--game-font", fontFamily(locale));
  scene.setLocale(locale);
  await scene.load();
  ready = true;
  scene.sync(getView(session.state), held);
  el("loading").hidden = true;
  render();
} catch (error) {
  el("loading").textContent =
    `${t("load_error")} ${String(error)}`;
}
if (new URLSearchParams(location.search).has("check")) {
  Object.assign(window, {
    __flyer: {
      resetCamera: () => scene.configure(DEFAULT_CAMERA),
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
        scene.clearEffects();
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
        scene.clearEffects();
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

import "./text.css";
import { helpText, normalizeCommand, playCommand, statusText } from "../cli/game";
import { Session } from "./session";

type Message = { input: string | null; response: string };

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const history = element<HTMLDivElement>("history");
const messagesElement = element<HTMLDivElement>("messages");
const input = element<HTMLInputElement>("command");
const form = element<HTMLFormElement>("command-form");
const resume = element<HTMLButtonElement>("resume");
const submit = element<HTMLButtonElement>("submit");
const fresh = () => {
  const game = new Session(crypto.getRandomValues(new Uint32Array(1))[0]);
  game.dispatch({ type: "roll_dice", indexesToReroll: [0, 1, 2, 3, 4] });
  return game;
};
let session = fresh();
let paused = false;
let composing = false;
let followLatest = false;
const webHelpText = helpText.slice(0, helpText.indexOf("\n終了と再開"))
  + "\n終了と開始\nquit：終了。new：新しいランを開始。\n再読み込みやタブを閉じると進行は消えます。";
history.addEventListener("scroll", () => {
  followLatest = history.scrollHeight - history.scrollTop - history.clientHeight < 72;
});

function append(message: Message, announce: boolean) {
  messagesElement.querySelectorAll("[aria-live]").forEach(element => {
    element.removeAttribute("aria-live");
    element.removeAttribute("aria-atomic");
  });
  const entry = document.createElement("div");
  entry.className = "exchange";
  if (message.input !== null) {
    const command = document.createElement("p");
    command.className = "entered-command";
    const prompt = document.createElement("span");
    prompt.setAttribute("aria-hidden", "true");
    prompt.textContent = "> ";
    command.append(prompt, message.input);
    entry.append(command);
  }
  if (message.response) {
    const response = document.createElement("p");
    response.className = "response";
    if (announce) {
      response.setAttribute("aria-live", "polite");
      response.setAttribute("aria-atomic", "true");
      setTimeout(() => {
        response.textContent = message.response;
        if (followLatest) history.scrollTop = history.scrollHeight;
      }, 100);
    } else {
      response.textContent = message.response;
    }
    entry.append(response);
  }
  messagesElement.append(entry);
}

function record(input: string | null, response: string, announce = true) {
  const follow = followLatest;
  append({ input, response }, announce);
  if (follow) history.scrollTop = history.scrollHeight;
}

function updatePaused() {
  input.disabled = paused;
  submit.disabled = paused;
  resume.hidden = !paused;
  form.hidden = paused;
}

record(null, statusText(session.state, true).replace(/^第1ターン。/, "第1ターン開始。"), false);
record(null, "残す出目か枠名を入力。helpで操作一覧。", false);
updatePaused();

function execute(raw: string) {
  if (paused) return;
  const command = normalizeCommand(raw);
  let response: string;
  if (command === "new") {
    session = fresh();
    response = statusText(session.state, true);
  } else if (["quit", "exit", "q", "終了"].includes(command)) {
    paused = true;
    response = "終了しました。";
  } else if (command === "save") {
    response = "保存は行いません。";
  } else {
    response = playCommand(session, raw).text;
    if (response === helpText) response = webHelpText;
  }
  record(raw, response);
  updatePaused();
  if (paused) resume.focus({ preventScroll: true });
}

input.addEventListener("compositionstart", () => { composing = true; });
input.addEventListener("compositionend", () => { composing = false; });
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && (event.isComposing || composing || event.keyCode === 229)) event.preventDefault();
});
form.addEventListener("submit", event => {
  event.preventDefault();
  if (composing || paused) return;
  const raw = input.value;
  input.value = "";
  followLatest = true;
  execute(raw);
});
resume.addEventListener("click", () => {
  paused = false;
  updatePaused();
  followLatest = true;
  record(null, statusText(session.state, true, true));
  input.focus({ preventScroll: true });
});

function fitViewport() {
  const viewport = window.visualViewport;
  if (!viewport || viewport.scale !== 1) return;
  const follow = followLatest;
  document.documentElement.style.setProperty("--viewport-height", `${viewport.height}px`);
  document.documentElement.style.setProperty("--viewport-top", `${viewport.offsetTop}px`);
  if (follow) history.scrollTop = history.scrollHeight;
}
window.visualViewport?.addEventListener("resize", fitViewport);
window.visualViewport?.addEventListener("scroll", fitViewport);
fitViewport();

import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { helpText, normalizeCommand, playCommand, statusText } from "./game";
import { loadSession, saveSession } from "./storage";
import { Session } from "../src/session";
import { appendTranscript, callContext } from "./transcript";
import type { TranscriptEvent } from "./transcript";

async function main() {
  const { values } = parseArgs({ options: {
    seed: { type: "string" }, resume: { type: "string" }, save: { type: "string" }, help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("npm run play -- [--seed 整数] [--save 保存先]\nnpm run play -- --resume 保存先\n\n" + helpText);
    return;
  }
  if (values.resume && (values.seed !== undefined || values.save)) throw new Error("--resumeは--seed、--saveと併用できません。");
  if (values.seed !== undefined && (!/^\d+$/.test(values.seed) || Number(values.seed) > 0xffffffff)) {
    throw new Error("--seedには0〜4294967295の整数を指定してください。");
  }
  const directory = values.save || values.resume ? dirname(resolve((values.save || values.resume)!))
    : join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "flyer-dungeon", "cli");
  const newPath = () => join(directory, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`);
  let path = values.resume ? resolve(values.resume) : values.save ? resolve(values.save) : newPath();
  if (!values.resume && existsSync(path)) throw new Error("保存先は既に存在します。再開には--resumeを使ってください。");
  const fresh = (seed = randomBytes(4).readUInt32LE(0)) => {
    const game = new Session(seed);
    game.dispatch({ type: "roll_dice", indexesToReroll: [0, 1, 2, 3, 4] });
    return game;
  };
  let session = values.resume ? loadSession(path) : fresh(values.seed === undefined ? undefined : Number(values.seed));
  saveSession(path, session);
  const opening = `${statusText(session.state, true)}\n操作：help。終了：quit。`;
  appendTranscript(path, { event: values.resume ? "resume" : "start", context: callContext(path, session), response: opening });
  console.log(opening);
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const reader = createInterface({ input: process.stdin, output: process.stdout, terminal: interactive, prompt: "> " });
  let endReason: Extract<TranscriptEvent, { event: "end" }>["reason"] = "eof";
  const interrupt = () => { endReason = "sigint"; reader.close(); };
  reader.on("SIGINT", interrupt);
  process.on("SIGINT", interrupt);
  if (interactive) reader.prompt();
  try {
    for await (const input of reader) {
      const timestamp = new Date().toISOString();
      const sourcePath = path;
      const before = callContext(path, session);
      const command = normalizeCommand(input);
      let response: string;
      let outcome: Extract<TranscriptEvent, { event: "input" }>["outcome"];
      try {
        if (["quit", "exit", "q", "終了"].includes(command)) {
          endReason = "quit";
          response = "";
          outcome = "quit";
        } else if (command === "new") {
          const nextPath = newPath();
          const nextSession = fresh();
          saveSession(nextPath, nextSession);
          path = nextPath;
          session = nextSession;
          response = statusText(session.state, true);
          outcome = "new";
        } else if (command === "save") {
          response = `保存先：${path}`;
          outcome = "save";
        } else {
          const result = playCommand(session, input);
          if (result.changed) saveSession(path, session);
          response = result.text;
          outcome = result.outcome;
        }
      } catch (error) {
        appendTranscript(sourcePath, { event: "input", input, command, outcome: "error", before,
          after: callContext(path, session), response: `エラー：${(error as Error).message}` }, timestamp);
        throw error;
      }
      appendTranscript(sourcePath, { event: "input", input, command, outcome, before,
        after: callContext(path, session), response }, timestamp);
      if (outcome === "new") appendTranscript(path, {
        event: "start", context: callContext(path, session), response, previousRun: sourcePath,
      });
      if (response) console.log(response);
      if (outcome === "quit") break;
      if (interactive) reader.prompt();
    }
  } catch (error) {
    endReason = "error";
    throw error;
  } finally {
    process.off("SIGINT", interrupt);
    reader.close();
    const response = endReason === "error" ? "" : `保存先：${path}`;
    appendTranscript(path, { event: "end", reason: endReason, context: callContext(path, session), response });
    if (response) console.log(response);
  }
}

main().catch(error => {
  console.error(`エラー：${error.message}`);
  process.exitCode = 1;
});

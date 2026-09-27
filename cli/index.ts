import { randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { helpText, normalizeCommand, playCommand, statusText } from "./game";
import { loadSession, saveSession } from "./storage";
import { Session } from "../src/session";

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
  console.log(statusText(session.state, true));
  console.log("操作：help。終了：quit。");
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const reader = createInterface({ input: process.stdin, output: process.stdout, terminal: interactive, prompt: "> " });
  reader.on("SIGINT", () => reader.close());
  if (interactive) reader.prompt();
  try {
    for await (const input of reader) {
      const command = normalizeCommand(input);
      if (["quit", "exit", "q", "終了"].includes(command)) break;
      if (command === "new") {
        const nextPath = newPath();
        const nextSession = fresh();
        saveSession(nextPath, nextSession);
        path = nextPath;
        session = nextSession;
        console.log(statusText(session.state, true));
      } else if (command === "save") {
        console.log(`保存先：${path}`);
      } else {
        const result = playCommand(session, input);
        if (result.changed) saveSession(path, session);
        if (result.text) console.log(result.text);
      }
      if (interactive) reader.prompt();
    }
  } finally {
    reader.close();
  }
  console.log(`保存先：${path}`);
}

main().catch(error => {
  console.error(`エラー：${error.message}`);
  process.exitCode = 1;
});

import { isDeepStrictEqual } from "node:util";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getView } from "../src/rules";
import { RULES_VERSION, Session } from "../src/session";
import type { PlayerAction } from "../src/types";

function isAction(value: unknown): value is PlayerAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  const view = getView(new Session(0).state);
  if (action.type === "roll_dice") return Array.isArray(action.indexesToReroll)
    && action.indexesToReroll.every(i => Number.isInteger(i) && i >= 0 && i < 5)
    && new Set(action.indexesToReroll).size === action.indexesToReroll.length;
  if (action.type === "select_category") return view.categories.some(c => c.id === action.categoryId);
  if (action.type === "use_skill") return Object.keys(view.skills).includes(String(action.skillId))
    && Number.isInteger(action.targetDieIndex) && Number(action.targetDieIndex) >= 0 && Number(action.targetDieIndex) < 5;
  return false;
}

export function loadSession(path: string): Session {
  const saved = JSON.parse(readFileSync(path, "utf8"));
  if (!saved || saved.rulesVersion !== RULES_VERSION || !Number.isInteger(saved.seed)
    || saved.seed < 0 || saved.seed > 0xffffffff || !Array.isArray(saved.entries)) {
    throw new Error("保存データの形式またはルールバージョンが一致しません。");
  }
  const session = new Session(saved.seed);
  for (const entry of saved.entries) {
    if (!entry || !isAction(entry.action)) throw new Error("保存データに不正な操作があります。");
    session.dispatch(entry.action);
    if (!isDeepStrictEqual(session.entries[session.entries.length - 1], entry)) {
      throw new Error("保存データの再現結果が一致しません。");
    }
  }
  if (!session.state.dice.length) throw new Error("保存データに進行中の手番がありません。");
  return session;
}

export function saveSession(path: string, session: Session): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(session.dump(), null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, path);
}

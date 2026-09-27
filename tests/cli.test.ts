import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { playCommand, statusText } from "../cli/game";
import { loadSession, saveSession } from "../cli/storage";
import { init } from "../src/rules";
import { RULES_VERSION, Session } from "../src/session";
import type { CategoryId, DieValue } from "../src/types";

function fresh(seed = 1880384492): Session {
  const session = new Session(seed);
  session.dispatch({ type: "roll_dice", indexesToReroll: [0, 1, 2, 3, 4] });
  return session;
}

function fixture(dice: DieValue[], rolls = 1): Session {
  const session = new Session(1);
  session.state.dice = dice;
  session.state.rollsUsed = rolls;
  return session;
}

function unlock(session: Session, group: "str" | "dex" | "int") {
  for (const id of (Object.keys(init().categories) as CategoryId[]).filter(id => id.startsWith(group)).slice(0, 3)) {
    session.state.categories[id] = true;
  }
}

test("the second conversation run reproduces the frozen engine log through victory", () => {
  const session = fresh();
  const commands = [
    "66", "B1", "2345", "2345", "pair", "566", "B2", "11", "11", "f of", "straight",
    "55", "55", "free", "11", "1s", "two pair", "556", "556", "B3", "remaining", "34",
    "dex 4 3s", "1", "dex 2 fullhouse", "12", "dex 5 int 6 B4", "remaining", "55", "2225",
    "dex 3 int 5 B5",
  ];
  for (const command of commands) {
    const result = playCommand(session, command);
    assert.equal(result.changed, command !== "remaining", `${command}: ${result.text}`);
  }
  assert.equal(session.state.status, "won");
  assert.equal(session.entries.length, 48);
  assert.equal(createHash("sha256").update(JSON.stringify(session.dump())).digest("hex"),
    "3c6553c54436fa4b657a0ee196eaf392c080e522c9c0162912da155713fd8f52");
  assert.equal(statusText(session.state), "2、2、2、2、2。B5突破、第13ターンで勝利。");
});

test("held faces are a multiset of values, independent of displayed sort order", () => {
  const session = fixture([4, 3, 2, 2, 4]);
  assert.equal(playCommand(session, "２３４").changed, true);
  assert.deepEqual(session.entries[0].action, { type: "roll_dice", indexesToReroll: [3, 4] });
  assert.deepEqual(session.state.dice.slice(0, 3), [4, 3, 2]);
  const all = fixture([6, 2, 4, 1, 3]);
  playCommand(all, "12346");
  assert.deepEqual(all.state.dice, [6, 2, 4, 1, 3]);
  assert.equal(all.state.rollsUsed, 2);
  assert.deepEqual(all.entries[0].random, []);
});

test("invalid compound commands consume neither skills, rolls nor random draws", () => {
  for (const command of ["1111", "str 3 B5", "str 3 int 5 nonsense", "str 3 str 6", "str 3 1111", "int 6", "6 6", "str 3 r B1"]) {
    const session = fixture([1, 1, 3, 4, 5]);
    unlock(session, "str");
    unlock(session, "int");
    const before = structuredClone(session.state);
    const result = playCommand(session, command);
    assert.equal(result.changed, false, command);
    assert.match(result.text, /変更なし/);
    assert.deepEqual(session.state, before);
    assert.deepEqual(session.entries, []);
    playCommand(session, "r");
    const control = fixture([1, 1, 3, 4, 5]);
    unlock(control, "str");
    unlock(control, "int");
    playCommand(control, "r");
    assert.deepEqual(session.dump(), control.dump());
  }
});

test("skills target current face values after earlier commands in the same line", () => {
  const session = fixture([4, 2, 5, 1, 1]);
  unlock(session, "str");
  unlock(session, "int");
  for (const floor of [1, 2, 3]) session.state.categories[`dungeon_floor_${floor}` as CategoryId] = true;
  const result = playCommand(session, "STR  5 int 6 B4");
  assert.equal(result.changed, true);
  assert.deepEqual(session.entries.slice(0, 2).map(e => e.action), [
    { type: "use_skill", skillId: "skill_str_mighty", targetDieIndex: 2 },
    { type: "use_skill", skillId: "skill_int_metamorph", targetDieIndex: 2 },
  ]);
  assert.equal(session.state.categories.dungeon_floor_4, true);
  assert.equal(session.state.rollsUsed, 1);
  assert.match(result.text, /B5：5個すべて同じ目/);
  assert.doesNotMatch(result.text, /合計/);
});

test("queries show requirements, group associations and skill availability without changing state", () => {
  const session = fresh();
  const before = session.dump();
  for (const command of ["remaining", "look", "skills", "rules", "help", "?", ""]) {
    assert.equal(playCommand(session, command).changed, false);
    assert.deepEqual(session.dump(), before);
  }
  assert.match(statusText(session.state, true), /第1ターン。B1：合計20以上/);
  assert.match(statusText(session.state), /知力のツーペア/);
  assert.doesNotMatch(statusText(session.state), /第1ターン/);
  assert.match(playCommand(session, "remaining").text, /B5（5個すべて同じ目・前階突破後）/);
  assert.match(playCommand(session, "rules").text, /筋力のフルハウス/);
});

test("category selection announces unlocking and automatically rolls the next turn", () => {
  const session = fixture([3, 3, 4, 5, 6]);
  session.state.categories.int_one_pair = true;
  session.state.categories.int_two_pair = true;
  unlock(session, "dex");
  const result = playCommand(session, "dex 4 3s");
  assert.match(result.text, /知力スキル解放/);
  assert.match(result.text, /敏捷・知力使用可/);
  assert.equal(session.state.rollsUsed, 1);
  assert.equal(session.state.skillsUsed.skill_dex_acrobatics, false);
  assert.equal(session.entries.length, 3);
});

test("spent and locked skills, used categories and depleted rolls are rejected", () => {
  const session = fixture([6, 6, 6, 6, 1], 3);
  session.state.categories.dungeon_floor_1 = true;
  assert.equal(playCommand(session, "str 1").changed, false);
  assert.equal(playCommand(session, "B1").changed, false);
  assert.equal(playCommand(session, "66").changed, false);
  assert.equal(playCommand(session, "B3").changed, false);
  unlock(session, "dex");
  assert.equal(playCommand(session, "dex 1").changed, true);
  assert.equal(playCommand(session, "dex 6").changed, false);
});

test("third-roll loss and skill-assisted wins are left to the rules engine", () => {
  const lost = fixture([1, 2, 5, 6, 6], 2);
  for (const id of Object.keys(lost.state.categories) as CategoryId[]) lost.state.categories[id] = id !== "dungeon_floor_5";
  const result = playCommand(lost, "12566");
  assert.equal(lost.state.status, "lost");
  assert.match(result.text, /第17ターンで敗北/);
  assert.equal(playCommand(lost, "int 1").changed, false);
  const won = fixture([2, 2, 2, 3, 5], 3);
  for (const id of Object.keys(won.state.categories) as CategoryId[]) won.state.categories[id] = id !== "dungeon_floor_5";
  const win = playCommand(won, "dex 3 int 5 B5");
  assert.equal(won.state.status, "won");
  assert.match(win.text, /B5突破、第17ターンで勝利/);
  assert.equal(won.entries.length, 3);
  assert.equal(playCommand(won, "B5").changed, false);
});

test("aliases used in conversation and Japanese names select the same categories", () => {
  const cases: [string[], CategoryId, DieValue[]][] = [
    [["fullhouse", "full house", "フルハウス"], "str_full_house", [2, 2, 2, 4, 4]],
    [["f of", "4 of", "フォーカード"], "str_four_of_a_kind", [2, 2, 2, 2, 4]],
    [["two pair", "ツーペア"], "int_two_pair", [2, 2, 3, 3, 4]],
    [["pair", "ワンペア"], "int_one_pair", [2, 2, 3, 4, 5]],
    [["straight", "ストレート"], "dex_straight", [1, 2, 3, 4, 5]],
    [["free", "自由枠"], "dex_free", [1, 2, 3, 4, 5]],
    [["B1", "地下1階"], "dungeon_floor_1", [6, 6, 6, 6, 6]],
  ];
  for (const [aliases, id, dice] of cases) for (const alias of aliases) {
    const session = fixture(dice);
    assert.equal(playCommand(session, alias).changed, true, alias);
    assert.equal(session.state.categories[id], true);
  }
});

test("saved sessions replay exactly, including the next random draw; damaged logs are rejected", t => {
  const directory = mkdtempSync(join(tmpdir(), "flyer-cli-storage-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "run.json");
  const session = fresh();
  playCommand(session, "66");
  saveSession(path, session);
  const resumed = loadSession(path);
  assert.deepEqual(resumed.dump(), session.dump());
  assert.deepEqual(playCommand(resumed, "B1"), playCommand(session, "B1"));
  assert.deepEqual(resumed.dump(), session.dump());
  const damaged = JSON.parse(readFileSync(path, "utf8"));
  damaged.entries[0].state.dice[0] = 0;
  writeFileSync(path, JSON.stringify(damaged));
  assert.throws(() => loadSession(path), /再現結果/);
  damaged.rulesVersion = "other";
  writeFileSync(path, JSON.stringify(damaged));
  assert.throws(() => loadSession(path), /バージョン/);
  damaged.rulesVersion = RULES_VERSION;
  damaged.entries[0].action.indexesToReroll = [0, 0];
  writeFileSync(path, JSON.stringify(damaged));
  assert.throws(() => loadSession(path), /不正な操作/);
});

test("the executable handles piped input, restart, EOF, resume and invalid options", t => {
  const directory = mkdtempSync(join(tmpdir(), "flyer-cli-process-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "run.json");
  const run = (args: string[], input = "") => spawnSync(process.execPath, ["--import", "tsx", resolve("cli/index.ts"), ...args], {
    input, encoding: "utf8", env: { ...process.env, XDG_STATE_HOME: directory }, timeout: 15000,
  });
  const first = run(["--seed", "1880384492", "--save", path], "66\nB1\nquit\n");
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /第2ターン。B2：合計24以上/);
  assert.doesNotMatch(first.stdout, /\u001b/);
  const before = readFileSync(path, "utf8");
  const resumed = run(["--resume", path], "2345\n");
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.equal(loadSession(path).state.rollsUsed, 2);
  const duplicate = run(["--save", path]);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /既に存在/);
  const current = readFileSync(path, "utf8");
  const invalid = run(["--resume", path, "--seed", "1"]);
  assert.equal(invalid.status, 1);
  assert.equal(readFileSync(path, "utf8"), current);
  for (const seed of ["-1", "4294967296", "abc", "1.5", ""]) assert.equal(run(["--seed", seed]).status, 1);
  const restart = run(["--seed", "1"], "new\nquit\n");
  assert.equal(restart.status, 0, restart.stderr);
  assert.equal(readdirSync(join(directory, "flyer-dungeon", "cli")).length, 2);
  assert.notEqual(current, before);
});

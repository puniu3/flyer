import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { playCommand, statusText } from "../cli/game";
import { loadSession, saveSession } from "../cli/storage";
import { RULES_VERSION, Session } from "../src/session";
import type { PlayerAction } from "../src/types";
import type { TranscriptRecord } from "../cli/transcript";

type Exchange = {
  input: string | null;
  actionCountBefore: number;
  actionCountAfter: number;
  response: string;
  responseSha256: string;
  actions: PlayerAction[];
  stateSha256: string;
};
type Branch = { exchanges: Exchange[]; engineLogSha256: string; terminalStatus: "lost" | "won" };
type Golden = {
  rulesVersion: string;
  seed: number;
  shared: Exchange[];
  fork: { afterActionCount: number; response: string; responseSha256: string };
  branches: Record<string, Branch>;
};

const fixturePath = new URL("./fixtures/cli-dialogue-golden.json", import.meta.url);
const fixtureBytes = readFileSync(fixturePath);
const golden: Golden = JSON.parse(fixtureBytes.toString("utf8"));
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const thresholdChanges: { input: string; actionCountAfter: number; afterLine: string; insertLine: string }[] =
  JSON.parse(readFileSync(new URL("./fixtures/cli-dialogue-threshold-5.json", import.meta.url), "utf8"));
const compactChanges: { before: string; after: string }[] =
  JSON.parse(readFileSync(new URL("./fixtures/cli-dialogue-compact-abilities.json", import.meta.url), "utf8"));

function compactResponse(response: string): string {
  return response.split("\n").map(line => compactChanges.find(change => change.before === line)?.after ?? line).join("\n");
}

function expectedResponse(exchange: Exchange): string {
  const change = thresholdChanges.find(change => change.input === exchange.input && change.actionCountAfter === exchange.actionCountAfter);
  if (!change) return compactResponse(exchange.response);
  const lines = exchange.response.split("\n");
  assert.equal(lines.filter(line => line === change.afterLine).length, 1);
  lines.splice(lines.indexOf(change.afterLine) + 1, 0, change.insertLine);
  return compactResponse(lines.join("\n"));
}

function equalBytes(actual: string | Buffer, expected: string | Buffer, label: string) {
  const received = Buffer.from(actual);
  const wanted = Buffer.from(expected);
  assert.ok(received.equals(wanted), `${label}\nExpected: ${wanted.toString("utf8")}\nReceived: ${received.toString("utf8")}`);
}

test("the owner-approved dialogue fixture is unchanged", () => {
  assert.equal(hash(fixtureBytes), "f3342974cab4996e3e8f8a6494ccd2e9aa6635afc8f6385c31c83c5983394354");
  assert.equal(readFileSync(new URL("./fixtures/cli-dialogue-golden.json.sha256", import.meta.url), "utf8"),
    `${hash(fixtureBytes)}  cli-dialogue-golden.json\n`);
  assert.equal(golden.rulesVersion, RULES_VERSION);
  for (const branch of Object.values(golden.branches)) {
    for (const exchange of [...golden.shared, ...branch.exchanges]) {
      assert.equal(hash(Buffer.from(exchange.response, "utf8")), exchange.responseSha256);
    }
  }
  assert.equal(hash(Buffer.from(golden.fork.response, "utf8")), golden.fork.responseSha256);
  assert.equal(thresholdChanges.length, 5);
  for (const change of thresholdChanges) {
    assert.equal(golden.shared.filter(exchange => exchange.input === change.input
      && exchange.actionCountAfter === change.actionCountAfter).length, 1);
  }
});

for (const [name, branch] of Object.entries(golden.branches)) {
  test(`golden ${name}: every raw input produces identical response bytes and engine state`, () => {
    const session = new Session(golden.seed);
    for (const [index, exchange] of [...golden.shared, ...branch.exchanges].entries()) {
      assert.equal(session.entries.length, exchange.actionCountBefore);
      let response: string;
      if (exchange.input === null) {
        session.dispatch({ type: "roll_dice", indexesToReroll: [0, 1, 2, 3, 4] });
        response = statusText(session.state, true);
      } else {
        response = playCommand(session, exchange.input).text;
      }
      equalBytes(response, expectedResponse(exchange), `${name} response ${index}: ${exchange.input ?? "start"}`);
      assert.equal(session.entries.length, exchange.actionCountAfter);
      assert.deepEqual(session.entries.slice(exchange.actionCountBefore).map(entry => entry.action), exchange.actions);
      assert.equal(hash(JSON.stringify(session.state)), exchange.stateSha256);
    }
    assert.equal(session.state.status, branch.terminalStatus);
    assert.equal(hash(JSON.stringify(session.dump())), branch.engineLogSha256);
  });

  test(`golden ${name}: the executable and transcript preserve every response byte`, t => {
    const directory = mkdtempSync(join(tmpdir(), "flyer-golden-"));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const path = join(directory, "run.json");
    const exchanges = [...golden.shared, ...branch.exchanges];
    const input = exchanges.flatMap(exchange => exchange.input === null ? [] : [exchange.input]).join("\n") + "\n";
    const result = spawnSync(process.execPath, ["--import", "tsx", resolve("cli/index.ts"), "--seed", String(golden.seed), "--save", path], {
      input, timeout: 15000,
    });
    assert.equal(result.status, 0, result.stderr.toString("utf8"));
    equalBytes(result.stdout, exchanges.map(exchange => expectedResponse(exchange) + "\n").join(""), `${name} stdout`);
    equalBytes(result.stderr, `保存先：${path}\n`, `${name} exit metadata`);
    const records: TranscriptRecord[] = readFileSync(`${path}.calls.jsonl`, "utf8").trim().split("\n").map(line => JSON.parse(line));
    const responses = records.filter(record => record.event === "start" || record.event === "input");
    assert.equal(responses.length, exchanges.length);
    for (const [index, record] of responses.entries()) {
      equalBytes(record.response, expectedResponse(exchanges[index]), `${name} recorded response ${index}`);
      if (record.event === "input") assert.equal(record.input, exchanges[index].input);
    }
    assert.equal(hash(JSON.stringify(loadSession(path).dump())), branch.engineLogSha256);
  });
}

test("the saved fork resumes at the same random position and follows the winning suffix", t => {
  const directory = mkdtempSync(join(tmpdir(), "flyer-golden-fork-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "fork.json");
  const session = new Session(golden.seed);
  for (const exchange of golden.shared) {
    if (exchange.input === null) session.dispatch({ type: "roll_dice", indexesToReroll: [0, 1, 2, 3, 4] });
    else playCommand(session, exchange.input);
  }
  assert.equal(session.entries.length, golden.fork.afterActionCount);
  saveSession(path, session);
  const branch = golden.branches.win;
  const result = spawnSync(process.execPath, ["--import", "tsx", resolve("cli/index.ts"), "--resume", path], {
    input: branch.exchanges.map(exchange => exchange.input).join("\n") + "\n", timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr.toString("utf8"));
  equalBytes(result.stdout, [compactResponse(golden.fork.response), ...branch.exchanges.map(expectedResponse)].map(text => text + "\n").join(""), "fork stdout");
  assert.equal(hash(JSON.stringify(loadSession(path).dump())), branch.engineLogSha256);
});

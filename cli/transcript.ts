import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { RULES_VERSION, Session } from "../src/session";
import type { CommandOutcome } from "./game";

export function callContext(run: string, session: Session) {
  return {
    run,
    actionCount: session.entries.length,
    turn: Object.values(session.state.categories).filter(Boolean).length + (session.state.status === "won" ? 0 : 1),
    rollsUsed: session.state.rollsUsed,
    status: session.state.status,
  };
}

type CallContext = ReturnType<typeof callContext>;

export type TranscriptEvent = (
  | { event: "start" | "resume"; context: CallContext; response: string; previousRun?: string }
  | { event: "input"; input: string; command: string; outcome: CommandOutcome | "new" | "quit" | "save" | "error";
      before: CallContext; after: CallContext; response: string }
  | { event: "end"; reason: "quit" | "eof" | "sigint" | "error"; context: CallContext; response: string }
) & { responseChannel?: "stdout" | "stderr" };

export type TranscriptRecord = TranscriptEvent & {
  logVersion: "flyer-cli-calls-1";
  uiVersion: "cli-5";
  rulesVersion: string;
  timestamp: string;
  responseChannel: "stdout" | "stderr";
};

export function appendTranscript(run: string, event: TranscriptEvent, timestamp = new Date().toISOString()): void {
  mkdirSync(dirname(run), { recursive: true });
  const record: TranscriptRecord = {
    logVersion: "flyer-cli-calls-1", uiVersion: "cli-5", rulesVersion: RULES_VERSION, timestamp,
    responseChannel: "stdout", ...event,
  };
  appendFileSync(`${run}.calls.jsonl`, `${JSON.stringify(record)}\n`, { mode: 0o600 });
}

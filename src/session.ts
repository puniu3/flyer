import { init, step } from "./rules";
import type { GameState, PlayerAction } from "./types";
export const RULES_VERSION = "flyer-1";
export type RecordEntry = {
  action: PlayerAction;
  random: number[];
  state: GameState;
};
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class Session {
  state = init();
  entries: RecordEntry[] = [];
  private random: () => number;
  constructor(readonly seed: number) {
    this.random = seededRandom(seed);
  }
  dispatch(action: PlayerAction) {
    const random: number[] = [];
    this.state = step(this.state, action, () => {
      const v = this.random();
      random.push(v);
      return v;
    });
    this.entries.push({
      action: structuredClone(action),
      random,
      state: structuredClone(this.state),
    });
    return this.state;
  }
  dump() {
    return {
      rulesVersion: RULES_VERSION,
      seed: this.seed,
      entries: this.entries,
    };
  }
}

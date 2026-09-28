import { getView, step } from "../src/rules";
import { Session } from "../src/session";
import type { CategoryGroup, CategoryId, DieValue, GameState, PlayerAction, SkillId } from "../src/types";

const groups = { dungeon: "ダンジョン", str: "筋力", dex: "敏捷", int: "知力" };
const categories: Record<CategoryId, { name: string; condition: string; aliases: string[] }> = {
  dungeon_floor_1: { name: "B1", condition: "合計20以上", aliases: ["b1", "地下1階"] },
  dungeon_floor_2: { name: "B2", condition: "合計24以上", aliases: ["b2", "地下2階"] },
  dungeon_floor_3: { name: "B3", condition: "合計26以上", aliases: ["b3", "地下3階"] },
  dungeon_floor_4: { name: "B4", condition: "合計9以下", aliases: ["b4", "地下4階"] },
  dungeon_floor_5: { name: "B5", condition: "5個すべて同じ目", aliases: ["b5", "地下5階"] },
  str_full_house: { name: "フルハウス", condition: "同じ目3個と別の目2個", aliases: ["full house", "fullhouse", "フルハウス"] },
  str_four_of_a_kind: { name: "フォーカード", condition: "同じ目4個以上", aliases: ["4 of", "f of", "four of a kind", "フォーカード"] },
  str_three_of_a_kind_5: { name: "5が3個", condition: "5が3個以上", aliases: ["5s", "5が3個"] },
  str_three_of_a_kind_6: { name: "6が3個", condition: "6が3個以上", aliases: ["6s", "6が3個"] },
  dex_free: { name: "自由枠", condition: "出目を問わない", aliases: ["free", "自由枠"] },
  dex_straight: { name: "ストレート", condition: "1〜5または2〜6を1個ずつ", aliases: ["straight", "straigt", "ストレート"] },
  dex_three_of_a_kind_1: { name: "1が3個", condition: "1が3個以上", aliases: ["1s", "1が3個"] },
  dex_three_of_a_kind_2: { name: "2が3個", condition: "2が3個以上", aliases: ["2s", "2が3個"] },
  int_one_pair: { name: "ワンペア", condition: "同じ目2個以上", aliases: ["pair", "one pair", "ワンペア"] },
  int_two_pair: { name: "ツーペア", condition: "異なる2種類の目が各2個以上", aliases: ["two pair", "two pairs", "ツーペア"] },
  int_three_of_a_kind_3: { name: "3が3個", condition: "3が3個以上", aliases: ["3s", "3が3個"] },
  int_three_of_a_kind_4: { name: "4が3個", condition: "4が3個以上", aliases: ["4s", "4が3個"] },
};
const skills: { id: SkillId; group: Exclude<CategoryGroup, "dungeon">; command: string; effect: string; unlock: string }[] = [
  { id: "skill_str_mighty", group: "str", command: "str", effect: "1個を6にする", unlock: "1個の出目を6にできます" },
  { id: "skill_dex_acrobatics", group: "dex", command: "dex", effect: "1個を1減らす（最小1）", unlock: "1個の出目を1減らせます" },
  { id: "skill_int_metamorph", group: "int", command: "int", effect: "1個を裏返す（1↔6、2↔5、3↔4）", unlock: "1個を裏返せます（1↔6、2↔5、3↔4）" },
];
const categoryIds = Object.keys(categories) as CategoryId[];

export function normalizeCommand(input: string): string {
  return input.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

function turn(state: GameState): number {
  const completed = Object.values(state.categories).filter(Boolean).length;
  return completed + (state.status === "won" ? 0 : 1);
}

function categoryLabel(id: CategoryId): string {
  const group = id.split("_")[0] as CategoryGroup;
  const name = categories[id].name;
  return `${group === "dungeon" ? "" : `${groups[group]}の`}${id.includes("three_of_a_kind") ? `「${name}」` : name}`;
}

function nextDungeon(state: GameState): string {
  const id = categoryIds.find(id => id.startsWith("dungeon_") && !state.categories[id]);
  return id ? `${categories[id].name}：${categories[id].condition}。` : "";
}

function unusedAbilitiesText(state: GameState): string {
  const remaining = getView(state).categories.filter(c => c.group !== "dungeon" && !c.isChecked);
  return remaining.length <= 2 ? `能力の残り：${remaining.map(c => categoryLabel(c.id)).join("、") || "なし"}。` : "";
}

function diceText(state: GameState): string {
  return [...state.dice].sort((a, b) => a - b).join("、") + "。";
}

function skillAvailabilityText(state: GameState): string {
  const view = getView(state);
  const available = skills.filter(s => view.skills[s.id].status === "available").map(s => groups[s.group]);
  if (available.length === skills.length) return "全スキル使用可。";
  if (available.length) return `${available.join("・")}使用可。`;
  if (skills.some(s => view.skills[s.id].status === "used")) return "スキル使用済み。";
  return turn(state) === 1 && state.rollsUsed === 1 ? "スキル未解放。" : "";
}

function rerollsText(state: GameState): string {
  const rolls = getView(state).rolls;
  const remaining = rolls.max - rolls.current;
  return `振り直し${remaining ? `${remaining}回` : "なし"}。`;
}

export function statusText(state: GameState, startOfTurn = false, restored = false): string {
  const view = getView(state);
  const dice = diceText(state);
  const sum = !state.categories.dungeon_floor_4
    ? `合計${state.dice.reduce<number>((a, b) => a + b, 0)}。` : "";
  if (state.status === "won") return `${dice}B5突破、第${turn(state)}ターンで勝利。`;
  if (state.status === "lost") {
    const cleared = categoryIds.filter(id => id.startsWith("dungeon_") && state.categories[id]);
    const progress = cleared.length ? `${categories[cleared[cleared.length - 1]].name}まで突破しました。` : "";
    return `${dice}${sum}\n全スキルを組み合わせても残りの枠を達成できず、第${turn(state)}ターンで敗北。${progress}`;
  }
  const selectable = view.categories.filter(c => c.isSelectable);
  const choices = [...selectable.filter(c => c.id !== "dex_free"), ...selectable.filter(c => c.id === "dex_free")]
    .map(c => categoryLabel(c.id));
  const atTurnStart = state.rollsUsed === 1 && !Object.values(state.skillsUsed).some(Boolean);
  const turnEnding = restored ? `${atTurnStart ? "開始" : ""}に戻りました。` : "。";
  return [
    ...(startOfTurn ? [`第${turn(state)}ターン${turnEnding}${nextDungeon(state)}`, ...[unusedAbilitiesText(state)].filter(Boolean)] : []),
    `${dice}${sum}${rerollsText(state)}${skillAvailabilityText(state)}`,
    `確定可：${choices.join("、") || "なし"}。`,
  ].join("\n");
}

function remainingText(state: GameState): string {
  const view = getView(state);
  const remaining = view.categories.filter(c => !c.isChecked);
  return [`残り${remaining.length}枠。`, ...Object.entries(groups).flatMap(([group, name]) => {
    const rows = remaining.filter(c => c.group === group);
    if (!rows.length) return [];
    const names = rows.map(c => c.group === "dungeon"
      ? `${categories[c.id].name}（${c.id === "dungeon_floor_5" ? "5個同じ目" : categories[c.id].condition}）`
      : categories[c.id].name);
    const skill = skills.find(s => s.group === group);
    const checked = view.categories.filter(c => c.group === group && c.isChecked).length;
    const progress = skill && checked < 3 ? `解放まであと${3 - checked}枠。` : "";
    return [`${name}：${names.join(group === "dungeon" ? "→" : "、")}。${progress}`];
  })].join("\n");
}

export const helpText = [
  "55：5を2個残してほかを振り直す。r：全部振り直す。",
  "B1〜B5、1s〜6s、pair、two pair、full house、4 of、straight、free：枠を確定。",
  "str 4：筋力で4を1個6にする。dex 3：敏捷で3を1個減らす。int 5：知力で5を1個裏返す。対象は位置ではなく出目。",
  "dex 3 int 5 B5：左から順に実行。保持指定または枠の確定は末尾に1つ。不正な入力は全体を取り消す。",
  "remaining：残り枠。look：現在の状況。skills：スキル。rules：役とルール。",
  "new：新しいラン。save：保存先。quit：終了。help：この説明。",
].join("\n");

function queryText(state: GameState, command: string): string | undefined {
  if (["help", "?", "ヘルプ"].includes(command)) return helpText;
  if (["look", "status", "状況"].includes(command)) return statusText(state, true);
  if (["remaining", "board", "残り", "残っている枠"].includes(command)) {
    return `${remainingText(state)}\n現在${diceText(state)}${rerollsText(state)}${skillAvailabilityText(state)}`;
  }
  if (["skills", "スキル"].includes(command)) {
    const view = getView(state);
    const labels = { locked: "未解放", available: "使用可", used: "使用済み" };
    return skills.map(s => `${groups[s.group]}（${s.command}）：${s.effect}。${labels[view.skills[s.id].status]}。`).join("\n")
      + "\n各スキルは毎ターン1回。効果が変わらない指定でも消費。";
  }
  if (["rules", "ルール"].includes(command)) {
    return [
      "各ターンは最初のロールと振り直し2回。達成した未使用枠を1つ確定すると次のターンへ。",
      "同じ能力の枠を3つ埋めるとスキル解放。各スキルは毎ターン1回、ロールの前後に使用可。",
      "B1から順に突破し、B5で勝利。最後のロール後、スキルを組み合わせても枠を達成できなければ敗北。",
      ...categoryIds.map(id => `${categoryLabel(id)}：${categories[id].condition}。`),
    ].join("\n");
  }
  return undefined;
}

function planCommand(initial: GameState, command: string): PlayerAction[] {
  let state = initial;
  let rest = command;
  const actions: PlayerAction[] = [];
  const ensurePlaying = () => {
    if (state.status !== "playing") throw new Error("ゲーム終了。newで次のランを開始できます。");
  };
  while (rest) {
    ensurePlaying();
    const match = rest.match(/^(str|dex|int|turn|筋力|敏捷|知力)\s+([1-6])(?:\s+|$)/);
    if (!match) break;
    const skill = skills.find(s => s.command === match[1] || groups[s.group] === match[1]
      || (match[1] === "turn" && s.command === "int"))!;
    const status = getView(state).skills[skill.id].status;
    if (status !== "available") throw new Error(`${groups[skill.group]}は${status === "locked" ? "未解放" : "使用済み"}です。`);
    const targetDieIndex = state.dice.indexOf(Number(match[2]) as DieValue);
    if (targetDieIndex < 0) throw new Error(`${match[2]}の出目はありません。`);
    const action: PlayerAction = { type: "use_skill", skillId: skill.id, targetDieIndex };
    actions.push(action);
    state = step(state, action);
    rest = rest.slice(match[0].length);
  }
  if (!rest && actions.length) return actions;
  ensurePlaying();
  if (/^[1-6]{1,5}$/.test(rest) || ["r", "roll", "振る"].includes(rest)) {
    if (!getView(state).rolls.canRoll) throw new Error("振り直しは残っていません。");
    const held = new Set<number>();
    for (const face of /^[1-6]+$/.test(rest) ? rest : "") {
      const index = state.dice.findIndex((value, i) => value === Number(face) && !held.has(i));
      if (index < 0) throw new Error(`${face}は${state.dice.filter(value => value === Number(face)).length}個しかありません。`);
      held.add(index);
    }
    actions.push({ type: "roll_dice", indexesToReroll: state.dice.map((_, i) => i).filter(i => !held.has(i)) });
    return actions;
  }
  const categoryId = categoryIds.find(id => categories[id].aliases.includes(rest));
  if (!categoryId) throw new Error("入力を解釈できません。helpで操作一覧。");
  const category = getView(state).categories.find(c => c.id === categoryId)!;
  if (category.isChecked) throw new Error(`${categoryLabel(categoryId)}は使用済みです。`);
  if (!category.isSelectable) throw new Error(`${categoryLabel(categoryId)}は確定できません。条件：${categories[categoryId].condition}${category.group === "dungeon" && categoryId !== "dungeon_floor_1" ? "・前階突破済み" : ""}。`);
  actions.push({ type: "select_category", categoryId });
  if (categoryId !== "dungeon_floor_5") actions.push({ type: "roll_dice", indexesToReroll: [0, 1, 2, 3, 4] });
  return actions;
}

export type CommandOutcome = "action" | "query" | "invalid" | "empty";

export function playCommand(session: Session, input: string): { text: string; changed: boolean; outcome: CommandOutcome } {
  const command = normalizeCommand(input);
  if (!command) return { text: "", changed: false, outcome: "empty" };
  const query = queryText(session.state, command);
  if (query !== undefined) return { text: query, changed: false, outcome: "query" };
  let actions: PlayerAction[];
  try {
    actions = planCommand(session.state, command);
  } catch (error) {
    return { text: `${(error as Error).message}変更なし。\n${diceText(session.state)}${skillAvailabilityText(session.state)}`, changed: false, outcome: "invalid" };
  }
  const changes: string[] = [];
  let confirmation = "";
  let directDungeon = false;
  let startOfTurn = false;
  for (const action of actions) {
    const before = getView(session.state);
    session.dispatch(action);
    if (action.type === "use_skill") {
      const skill = skills.find(s => s.id === action.skillId)!;
      changes.push(`${groups[skill.group]}で${before.dice[action.targetDieIndex]}を${session.state.dice[action.targetDieIndex]}`);
    }
    if (action.type === "select_category" && session.state.status !== "won") {
      const group = before.categories.find(c => c.id === action.categoryId)!.group;
      directDungeon = group === "dungeon" && changes.length === 0;
      const sum = before.dice.reduce<number>((a, b) => a + b, 0);
      confirmation = `${group === "dungeon" && changes.length ? `合計${sum}で` : ""}${categoryLabel(action.categoryId)}${group === "dungeon" ? "突破" : "確定"}。`;
      const after = getView(session.state);
      const skill = skills.find(s => s.group === group);
      if (skill && before.skills[skill.id].status === "locked") {
        const checked = after.categories.filter(c => c.group === group && c.isChecked).length;
        confirmation += checked < 3 ? `${groups[group]}${checked}/3。` : `${groups[group]}スキル解放：毎ターン1回、${skill.unlock}。`;
      }
      startOfTurn = true;
    }
  }
  const prefix = changes.length ? `${changes.join("、")}にし、` : "";
  const text = `${prefix}${confirmation}${confirmation && !directDungeon ? "\n" : ""}${statusText(session.state, startOfTurn)}`;
  return { text, changed: true, outcome: "action" };
}

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
  str_full_house: { name: "フルハウス", condition: "同じ目3個と別の目2個", aliases: ["full house", "full", "house", "boat", "fh", "3+2", "2+3", "フルハウス", "フル"] },
  str_four_of_a_kind: { name: "フォーカード", condition: "同じ目4個以上", aliases: ["4 of", "f of", "four of a kind", "4 of a kind", "four kind", "4 kind", "four card", "4 card", "quads", "quad", "4oak", "4+1", "1+4", "フォーカード", "4カード"] },
  str_three_of_a_kind_5: { name: "5が3個", condition: "5が3個以上", aliases: ["5s", "5が3個"] },
  str_three_of_a_kind_6: { name: "6が3個", condition: "6が3個以上", aliases: ["6s", "6が3個"] },
  dex_free: { name: "自由枠", condition: "出目を問わない", aliases: ["free", "any", "chance", "自由枠", "自由", "フリー"] },
  dex_straight: { name: "ストレート", condition: "1〜5または2〜6を1個ずつ", aliases: ["straight", "straigt", "run", "sequence", "ストレート", "連番"] },
  dex_three_of_a_kind_1: { name: "1が3個", condition: "1が3個以上", aliases: ["1s", "1が3個"] },
  dex_three_of_a_kind_2: { name: "2が3個", condition: "2が3個以上", aliases: ["2s", "2が3個"] },
  int_one_pair: { name: "ワンペア", condition: "同じ目2個以上", aliases: ["pair", "one pair", "1 pair", "1p", "ワンペア", "ペア", "1ペア"] },
  int_two_pair: { name: "ツーペア", condition: "異なる2種類の目が各2個以上", aliases: ["two pair", "two pairs", "2 pair", "2 pairs", "2p", "double pair", "2+2", "2+2+1", "ツーペア", "ツーペアー", "2ペア"] },
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

function categoryKey(input: string): string {
  return normalizeCommand(input).replace(/[\s_\-「」『』・]/g, "")
    .replace(/[ぁ-ゖ]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60));
}

const categoryAliases = categoryIds.map(id => {
  const aliases = [...categories[id].aliases];
  const face = id.match(/three_of_a_kind_([1-6])$/)?.[1];
  if (face) aliases.push(`${face}x3`, `${face}×3`, `${face}*3`, `${face}が3つ`, `${face}を3個`);
  const floor = id.match(/dungeon_floor_([1-5])$/)?.[1];
  if (floor) aliases.push(`b${floor}f`, `地下${floor}`, `地下${floor}f`);
  const group = id.split("_")[0] as CategoryGroup;
  return { id, group, aliases: [...new Set(aliases.map(categoryKey))] };
});

function resolveCategory(command: string): CategoryId | undefined {
  let key = categoryKey(command);
  const qualifier = Object.entries(groups).find(([, name]) => key.startsWith(name));
  if (qualifier) key = key.slice(qualifier[1].length).replace(/^ノ/, "");
  const candidates = categoryAliases.filter(category => !qualifier || category.group === qualifier[0]);
  const exact = candidates.filter(category => category.aliases.includes(key));
  if (exact.length) return exact.length === 1 ? exact[0].id : undefined;
  if (!/^[a-zァ-ヶー]{2,}$/.test(key)) return undefined;
  if (["str", "dex", "int", "turn", "help", "look", "status", "remaining", "board", "skills", "rules", "roll", "new", "quit", "exit", "save"]
    .some(reserved => reserved.startsWith(key))) return undefined;
  const matches = candidates.filter(category => category.aliases.some(alias => alias.startsWith(key)));
  return matches.length === 1 ? matches[0].id : undefined;
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
  if (remaining.length > 6) return "";
  const summaries = skills.flatMap(skill => {
    const rows = remaining.filter(c => c.group === skill.group);
    const names = rows.map(c => c.id.includes("three_of_a_kind") ? `${c.id.slice(-1)}s` : categories[c.id].name);
    return names.length ? [`${groups[skill.group]} ${names.join("、")}。`] : [];
  });
  return `残り：${summaries.join("") || "なし。"}`;
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

const gameOverview = [
  "5個のダイスを1ターンに3回まで振って、役を作る1人用ゲームです。たとえば、同じ目が2個あればワンペアです。役を作りながら、ダンジョンの地下5階突破を目指します。",
  "最初は5個全部を振ります。その後は、欲しい出目を残して、ほかを振り直せます。振り直しはあと2回。使い切る前に出目を決めてもかまいません。",
  "出目が決まったら、条件に合う『枠』を1つ埋めます。枠には、役や出目の合計の条件があります。1枠埋めると次のターンになり、また5個全部を振ります。同じ枠は一度しか使えません。",
  "枠には、ダンジョンを進む枠と、能力を育てる枠があります。ダンジョンの枠は地下1階のB1からB5まで順に埋め、B5を埋めれば勝利です。各ターン、次の階に挑むか、能力枠を埋めるかを選びます。",
  "能力は筋力・敏捷・知力の3つです。同じ能力の枠を3つ埋めると、ダイスの目を変えるスキルが使えるようになります。能力枠を全部埋める必要はありません。",
  "振り直しが残っておらず、使えるスキルを組み合わせても未使用の枠を1つも埋められなければ敗北です。",
].join("\n\n");

export const helpText = [
  "初めて遊ぶ方はrulesでルールを読んでください。helpは操作一覧です。",
  "入力は1行ずつ、Enterで実行します。",
  "\n振り直し",
  "55：今ある5を2個残して、ほかを振り直す。残す出目は毎回、空白を入れずに指定。r：全部振り直す。",
  "\n枠の確定",
  "『確定可』から選び、枠の名前を入力します。日本語名でも入力できます。例：ワンペア、またはpair。",
  "ダンジョン：B1、B2、B3、B4、B5。",
  "筋力：full house＝フルハウス、4 of＝フォーカード、5s、6s。",
  "敏捷：free＝自由枠、straight＝ストレート、1s、2s。",
  "知力：pair＝ワンペア、two pair＝ツーペア、3s、4s。",
  "\nスキル",
  "str 4：筋力で4を1個6にする。dex 3：敏捷で3を1個2にする。int 5：知力で5を1個2にする。対象は位置ではなく今の出目。",
  "単独でも、str 4 int 6 B4のように続けても入力できます。左から順に実行。振り直しで残す出目か枠の確定は末尾に1つ。不正な入力はその1行全体を取り消します。",
  "\n確認",
  "look：現在の状況。remaining：未使用枠。skills：スキルの効果と使用可否。確認ではゲームは進みません。",
  "help：操作一覧。rules：ゲームの説明。",
  "\n終了と再開",
  "quit：終了。save：自動保存先を表示。new：今のランを保存して、新しいランを開始。",
  "再開はターミナルで npm run play -- --resume 保存先 を実行。『保存先』を表示されたファイルのパスに置き換えてください。",
].join("\n");

const rulesText = [
  gameOverview,
  "\n枠の条件：ダンジョン",
  "B1からB5までの順に突破します。合計は5個すべての出目を足した値です。",
  ...categoryIds.filter(id => id.startsWith("dungeon_")).map(id => `${categories[id].name}：${categories[id].condition}。`),
  "\n枠の条件：能力",
  "能力枠は好きな順で埋められます。",
  ...skills.flatMap(skill => categoryIds.filter(id => id.startsWith(`${skill.group}_`))
    .map(id => `${categoryLabel(id)}：${categories[id].condition}。${id === "str_full_house" ? "5個同じ目では成立しません。" : ""}`)),
  "\n役が重なるとき",
  "2、2、2、5、5なら、フルハウス、ツーペア、ワンペアの条件を満たします。そのうち未使用の枠を1つだけ選びます。",
  "\nスキルの使い方",
  "各能力には4枠あり、そのうち3枠を埋めると対応するスキルが解放されます。解放後は、各スキルを毎ターン1回ずつ使えます。",
  "筋力はダイス1個を6にします。",
  "敏捷はダイス1個の目を1減らします。1より小さくはなりません。",
  "知力はダイス1個を裏返します。1と6、2と5、3と4が入れ替わります。",
  "同じダイスに別のスキルを続けて使うこともできます。振り直しの前後にも、振り直しを使い切った後にも使えます。次のターンには再び使えるようになります。",
  "\n表示の読み方",
  "短縮表示の1sから6sは、その数字の出目が3個以上ある枠を表します。",
  "『確定可』は今の出目で埋められる枠です。『残り』には、まだ条件を満たしていない未使用枠も含みます。『確定可：なし』でも、振り直しやスキルで条件を満たせる間は続けられます。",
  "操作を調べるときはhelpを入力してください。",
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
  if (["rules", "ルール"].includes(command)) return rulesText;
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
  const categoryId = resolveCategory(rest);
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

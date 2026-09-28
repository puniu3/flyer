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

export const helpText = [
  "5個のサイコロで条件を満たし、B1からB5まで順に突破する1人用ゲームです。",
  "操作は1行入力してEnter。最初のサイコロは自動で振られています。振り直しは毎ターン最大2回です。",
  "振り直す：55なら、今ある5を2個残してほかを振り直します。rなら全部。残す出目は毎回指定します。数字の間に空白は入れません。",
  "確定する：『確定可』から1枠を選び、B1やpairのように入力します。振り直しを使い切る必要はありません。確定すると次のターンが自動で始まります。",
  "役の入力名。筋力：full house＝フルハウス、4 of＝フォーカード、5s、6s。",
  "敏捷：free＝自由枠、straight＝ストレート、1s、2s。知力：pair＝ワンペア、two pair＝ツーペア、3s、4s。",
  "5sは『5が3個以上』の枠を確定する入力です。55は振り直し用です。日本語の役名だけでも入力できます。例：ワンペア。",
  "『確定可』は今の出目で選べる枠。『残り』は未使用の枠で、今は選べないものも含みます。",
  "look：現在の状況を再表示。remaining：未使用枠とスキル解放までの進み具合。確認の入力ではゲームは進みません。",
  "skills：スキルの効果と使用可否。同じ能力の枠を3つ埋めると使えます。例：str 4は今ある4を1個6に変えます。対象は位置ではなく出目です。",
  "スキルは単独でも、str 4 B3のように確定と続けても入力できます。不正な入力はその1行全体を取り消します。",
  "rules：詳しいルールと全枠の条件。help：この説明。",
  "進行は自動保存されます。save：保存先を表示。quit：終了。new：今のランを保存して、新しいランを開始。",
  "終了後の再開は、ターミナルで npm run play -- --resume 保存先 を実行します。『保存先』を表示されたファイルのパスに置き換えてください。",
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
      "目的：B1、B2、B3、B4、B5の順に突破し、B5を確定すると勝利です。能力枠を全部埋める必要はありません。",
      "枠とは、条件を満たしたときに選べる達成項目です。各枠は1ランに1回だけ使えます。",
      "各ターンの流れ：6面サイコロ5個が自動で振られます。好きな出目を残して、最大2回振り直せます。残す出目は毎回選び直せます。5個とも残しても、振り直し1回分を使います。",
      "条件を満たす未使用枠を1つ確定してターンを終えます。最初の出目でも確定できます。同時に複数の条件を満たしていても、選べるのは1枠です。",
      "ダンジョンの次の階か、筋力・敏捷・知力の能力枠を選びます。能力枠には順番の制限がありません。",
      "確定するとサイコロ5個と振り直し回数がリセットされ、次のターンが始まります。",
      "敗北：振り直しが残っておらず、使えるスキルを組み合わせても未使用枠を確定できないと敗北です。『確定可：なし』だけでは敗北とは限りません。",
      "\nダンジョンの条件。入力名はB1からB5。各階は直前の階を突破してから選べます。",
      ...categoryIds.filter(id => id.startsWith("dungeon_")).map(id => `${categories[id].name}：${categories[id].condition}。`),
      "\n能力枠の条件。かっこ内は入力名です。1sから6sは、その数字の出目が3個以上ある枠です。",
      ...skills.flatMap(skill => categoryIds.filter(id => id.startsWith(`${skill.group}_`))
        .map(id => `${categoryLabel(id)}（${categories[id].aliases[0]}）：${categories[id].condition}。`)),
      "例：2、2、2、5、5はフルハウスです。ツーペアやワンペアとしても確定できます。5個同じ目はフルハウスにはなりません。",
      "自由枠も1ランに1回だけです。選ぶと敏捷の枠が1つ埋まります。",
      "\nスキル：同じ能力の4枠のうち3枠を埋めると解放され、以後のターンでも使えます。",
      "各スキルは毎ターン1回。振り直しの前後や、振り直しを使い切った後にも使えます。次のターンには再び使えるようになります。",
      "str 4：筋力で、今ある4を1個6にします。dex 3：敏捷で、今ある3を1個2にします。敏捷では1より小さくなりません。",
      "int 5：知力で、今ある5を1個2にします。裏返す組み合わせは1と6、2と5、3と4です。",
      "スキルの対象は今の出目で指定し、同じサイコロに別のスキルを続けて使えます。出目が変わらなくても、そのスキルの1回分を使います。",
      "例：str 4 int 6は、筋力で4を6にした後、今ある6を1個1にします。スキルの後には、振り直しで残す出目か確定する枠を1つだけ続けられます。",
      "現在使えるスキルはskills、未使用枠はremaining、入力方法はhelpで確認できます。",
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

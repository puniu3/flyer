import test from "node:test";
import assert from "node:assert/strict";
import { init, step, getView } from "../src/rules";
import { Session, seededRandom } from "../src/session";
import type { CategoryId, DieValue, SkillId } from "../src/types";
const all = Object.keys(init().categories) as CategoryId[];
function oracle(id: CategoryId, d: DieValue[]) {
  const c = Array.from(
    { length: 6 },
    (_, i) => d.filter((v) => v === i + 1).length,
  );
  const sum = d.reduce((a, b) => a + b, 0);
  if (id.startsWith("dungeon"))
    return [sum >= 20, sum >= 24, sum >= 26, sum <= 9, Math.max(...c) === 5][
      Number(id.at(-1)) - 1
    ];
  if (id === "str_full_house") return c.includes(3) && c.includes(2);
  if (id === "str_four_of_a_kind") return Math.max(...c) >= 4;
  if (id === "dex_free") return true;
  if (id === "dex_straight")
    return new Set(d).size === 5 && Math.max(...d) - Math.min(...d) === 4;
  if (id === "int_one_pair") return Math.max(...c) >= 2;
  if (id === "int_two_pair") return c.filter((v) => v >= 2).length >= 2;
  return c[Number(id.at(-1)) - 1] >= 3;
}
test("all 7,776 dice hands preserve all seventeen category predicates", () => {
  for (let hand = 0; hand < 7776; hand++) {
    let n = hand;
    const dice = Array.from({ length: 5 }, () => {
      const v = (n % 6) + 1;
      n = Math.floor(n / 6);
      return v as DieValue;
    });
    for (const id of all) {
      const state = init();
      state.dice = dice;
      if (id.startsWith("dungeon") && id !== "dungeon_floor_1")
        state.categories[
          `dungeon_floor_${Number(id.at(-1)) - 1}` as CategoryId
        ] = true;
      assert.equal(
        getView(state).categories.find((c) => c.id === id)!.isSelectable,
        oracle(id, dice),
        `${id}: ${dice}`,
      );
    }
  }
});
test("ordered floors, single-use categories, turn reset and terminal states", () => {
  let s = init();
  s.dice = [6, 6, 6, 6, 6];
  s.rollsUsed = 1;
  assert.deepEqual(
    step(s, { type: "select_category", categoryId: "dungeon_floor_2" }),
    s,
  );
  s = step(s, { type: "select_category", categoryId: "dungeon_floor_1" });
  assert.equal(s.categories.dungeon_floor_1, true);
  assert.deepEqual(s.dice, []);
  assert.equal(s.rollsUsed, 0);
  s.dice = [6, 6, 6, 6, 6];
  assert.deepEqual(
    step(s, { type: "select_category", categoryId: "dungeon_floor_1" }),
    s,
  );
  s.categories.dungeon_floor_2 =
    s.categories.dungeon_floor_3 =
    s.categories.dungeon_floor_4 =
      true;
  s = step(s, { type: "select_category", categoryId: "dungeon_floor_5" });
  assert.equal(s.status, "won");
  assert.deepEqual(step(s, { type: "roll_dice", indexesToReroll: [0] }), s);
  assert.deepEqual(init(), new Session(1).state);
});
test("three rolls, selected indices, and all-held roll preserve old behavior", () => {
  let s = step(init(), { type: "roll_dice", indexesToReroll: [] }, () => 0);
  assert.deepEqual(s.dice, [1, 1, 1, 1, 1]);
  s = step(s, { type: "roll_dice", indexesToReroll: [1, 3] }, () => 0.999);
  assert.deepEqual(s.dice, [1, 6, 1, 6, 1]);
  s = step(s, { type: "roll_dice", indexesToReroll: [] }, () => 0.5);
  assert.equal(s.rollsUsed, 3);
  assert.deepEqual(s.dice, [1, 6, 1, 6, 1]);
  assert.deepEqual(
    step(s, { type: "roll_dice", indexesToReroll: [0] }, () => 0),
    s,
  );
});
test("skills unlock at three, modify one die, and reset once per turn", () => {
  const cases: [SkillId, string, DieValue, DieValue][] = [
    ["skill_str_mighty", "str", 2, 6],
    ["skill_dex_acrobatics", "dex", 1, 1],
    ["skill_int_metamorph", "int", 2, 5],
  ];
  for (const [skillId, group, input, output] of cases) {
    let s = init();
    s.dice = [input, 2, 3, 4, 5];
    s.rollsUsed = 1;
    const action = { type: "use_skill" as const, skillId, targetDieIndex: 0 };
    assert.deepEqual(step(s, action), s);
    for (const id of all.filter((id) => id.startsWith(group)).slice(0, 3))
      s.categories[id] = true;
    s = step(s, action);
    assert.equal(s.dice[0], output);
    assert.equal(s.skillsUsed[skillId], true);
    assert.deepEqual(step(s, action), s);
    s.dice = [6, 6, 6, 6, 6];
    s = step(s, { type: "select_category", categoryId: "dungeon_floor_1" });
    assert.equal(s.skillsUsed[skillId], false);
  }
});
test("third-roll defeat waits for every possible remaining skill sequence", () => {
  let s = init();
  for (const id of all) s.categories[id] = true;
  s.categories.dungeon_floor_5 = false;
  s.dice = [6, 6, 6, 6, 1];
  s.rollsUsed = 2;
  s = step(s, { type: "roll_dice", indexesToReroll: [] });
  assert.equal(s.status, "playing");
  s = step(s, {
    type: "use_skill",
    skillId: "skill_str_mighty",
    targetDieIndex: 4,
  });
  assert.equal(s.status, "playing");
  assert.equal(
    getView(s).categories.find((c) => c.id === "dungeon_floor_5")!.isSelectable,
    true,
  );
  let lost = init();
  for (const id of all) lost.categories[id] = true;
  lost.categories.dungeon_floor_5 = false;
  lost.dice = [1, 2, 3, 4, 5];
  lost.rollsUsed = 2;
  lost = step(lost, { type: "roll_dice", indexesToReroll: [] });
  assert.equal(lost.status, "lost");
});
test("logged random draws and action stream reproduce exact states", () => {
  const s = new Session(183);
  for (let turn = 0; turn < 12 && s.state.status === "playing"; turn++) {
    s.dispatch({ type: "roll_dice", indexesToReroll: [0, 1, 2, 3, 4] });
    const cat = getView(s.state).categories.find((c) => c.isSelectable);
    if (cat) s.dispatch({ type: "select_category", categoryId: cat.id });
    else s.dispatch({ type: "roll_dice", indexesToReroll: [0, 1, 2, 3, 4] });
  }
  let state = init();
  for (const entry of s.entries) {
    let i = 0;
    state = step(state, entry.action, () => entry.random[i++]);
    assert.deepEqual(state, entry.state);
    assert.equal(i, entry.random.length);
  }
  const a = seededRandom(183),
    b = seededRandom(183);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test("32 action traces exactly match the pre-remake engine", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const traces = JSON.parse(
    await readFile(new URL("./legacy-traces.json", import.meta.url), "utf8"),
  );
  for (const trace of traces) {
    const random = seededRandom(trace.seed);
    let state = init();
    const states = [state];
    for (const action of trace.actions) {
      state = step(state, action, random);
      states.push(state);
    }
    assert.equal(
      createHash("sha256").update(JSON.stringify(states)).digest("hex"),
      trace.hash,
      `seed ${trace.seed}`,
    );
  }
});

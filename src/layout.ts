import type { CategoryId, CategoryGroup, SkillId } from "./types";
export const GROUPS = ["str", "dex", "int"] as const;
export const COLORS = {
  dungeon: "#80633f",
  str: "#974e39",
  dex: "#68764d",
  int: "#807088",
};
export const SKILLS: Record<(typeof GROUPS)[number], SkillId> = {
  str: "skill_str_mighty",
  dex: "skill_dex_acrobatics",
  int: "skill_int_metamorph",
};
export const DUNGEON = { x: -7.5, z: 0, width: 4.2, depth: 10.2 };
export const ABILITY = { x: -2.7, width: 4.5, depth: 6.8, z: -1.7, gap: 0.35 };
export const abilityX = (i: number) => ABILITY.x + i * (ABILITY.width + ABILITY.gap);
const trayLeft = abilityX(0) - ABILITY.width / 2;
const trayRight = abilityX(2) + ABILITY.width / 2;
const trayTop = ABILITY.z + ABILITY.depth / 2 + ABILITY.gap;
const trayBottom = DUNGEON.z + DUNGEON.depth / 2;
const railWidth = 0.18;
export const TRAY = {
  x: (trayLeft + trayRight) / 2,
  z: (trayTop + trayBottom) / 2,
  width: trayRight - trayLeft - 2 * railWidth,
  depth: trayBottom - trayTop - 2 * railWidth,
  railWidth,
  railHeight: 0.26,
  floor: 0.18,
};
export type Slot = {
  id: CategoryId;
  group: CategoryGroup;
  x: number;
  z: number;
  label: string;
  mark: string;
};
export const slots: Slot[] = [
  ...["≥ 20", "≥ 24", "≥ 26", "≤ 9", "FIVE OF A KIND"].map((mark, i) => ({
    id: `dungeon_floor_${i + 1}` as CategoryId,
    group: "dungeon" as const,
    x: DUNGEON.x,
    z: -3.2 + i * 1.7,
    label: `B${i + 1}`,
    mark,
  })),
  ...GROUPS.flatMap((group, g) => {
    const entries =
      group === "str"
        ? [
            ["full_house", "FULL HOUSE"],
            ["four_of_a_kind", "FOUR OF A KIND"],
            ["three_of_a_kind_5", "5 · 5 · 5"],
            ["three_of_a_kind_6", "6 · 6 · 6"],
          ]
        : group === "dex"
          ? [
              ["free", "ANY"],
              ["straight", "STRAIGHT"],
              ["three_of_a_kind_1", "1 · 1 · 1"],
              ["three_of_a_kind_2", "2 · 2 · 2"],
            ]
          : [
              ["one_pair", "ONE PAIR"],
              ["two_pair", "TWO PAIR"],
              ["three_of_a_kind_3", "3 · 3 · 3"],
              ["three_of_a_kind_4", "4 · 4 · 4"],
            ];
    return entries.map(([id, mark], i) => ({
      id: `${group}_${id}` as CategoryId,
      group,
      x: abilityX(g),
      z: -3.2 + i * 1.0,
      label: mark,
      mark,
    }));
  }),
];
export const slotById = new Map(slots.map((s) => [s.id, s]));
export const SKILL_Z = 1.0;
export const SKILL_CARD = { offsetX: 0.55, width: 2.7, depth: 1.08, top: 0.318 };
export const markerX = (slot: Slot) => slot.x - (slot.group === "dungeon" ? 1.2 : 1.65);
export const assetUrl = (file: string) =>
  `${import.meta.env.BASE_URL}assets/${file}`;
export const SHEET_HEIGHT = 0.26;
export const SHEET_TOP = SHEET_HEIGHT + 0.003;
export function makeLayout() {
  const gap = ABILITY.gap;
  const dungeon = { ...DUNGEON, x: ABILITY.x - ABILITY.width / 2 - gap - DUNGEON.width / 2 };
  const abilities = GROUPS.map((_, i) => ({
    x: abilityX(i), z: ABILITY.z, width: ABILITY.width, depth: ABILITY.depth,
  }));
  const left = dungeon.x - dungeon.width / 2;
  const right = abilities[2].x + abilities[2].width / 2;
  const trayTop = ABILITY.z + ABILITY.depth / 2 + gap;
  const trayBottom = dungeon.z + dungeon.depth / 2;
  const trayLeft = abilities[0].x - abilities[0].width / 2;
  const tray = {
    ...TRAY, x: (trayLeft + right) / 2, z: (trayTop + trayBottom) / 2,
    width: right - trayLeft - 2 * TRAY.railWidth,
    depth: trayBottom - trayTop - 2 * TRAY.railWidth, railHeight: SHEET_TOP,
  };
  const skillPositions = abilities.map((b) => ({ x: b.x, z: SKILL_Z }));
  const positions = slots.map((slot) => {
    if (slot.group === "dungeon") return {
      ...slot, x: dungeon.x, hitWidth: dungeon.width - 0.3, hitDepth: 1.5,
    };
    return { ...slot, hitWidth: 4.5, hitDepth: 0.85 };
  });
  return {
    dungeon, abilities, tray, skillPositions, slots: positions, dieSpacing: 2.4,
    pawnX: dungeon.x - 1.2, pawnStartZ: dungeon.z - dungeon.depth / 2 + 0.8,
    left, right, top: dungeon.z - dungeon.depth / 2, bottom: trayBottom,
  };
}

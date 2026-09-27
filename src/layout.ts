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
export const markerX = (slot: Slot) => slot.x - (slot.group === "dungeon" ? 1.2 : 1.65);
export const assetUrl = (file: string) =>
  `${import.meta.env.BASE_URL}assets/${file}`;

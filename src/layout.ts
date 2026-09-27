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
export type Slot = {
  id: CategoryId;
  group: CategoryGroup;
  x: number;
  z: number;
  label: string;
  mark: string;
};
export const slots: Slot[] = [
  ...["≥ 20", "≥ 24", "≥ 26", "≤ 9", "5 ×"].map((mark, i) => ({
    id: `dungeon_floor_${i + 1}` as CategoryId,
    group: "dungeon" as const,
    x: -5.6 + i * 2.8,
    z: -4.57,
    label: `B${i + 1}`,
    mark,
  })),
  ...GROUPS.flatMap((group, g) => {
    const entries =
      group === "str"
        ? [
            ["full_house", "3 + 2"],
            ["four_of_a_kind", "4 ×"],
            ["three_of_a_kind_5", "5 · 5 · 5"],
            ["three_of_a_kind_6", "6 · 6 · 6"],
          ]
        : group === "dex"
          ? [
              ["free", "ANY"],
              ["straight", "1—5 / 2—6"],
              ["three_of_a_kind_1", "1 · 1 · 1"],
              ["three_of_a_kind_2", "2 · 2 · 2"],
            ]
          : [
              ["one_pair", "2 ×"],
              ["two_pair", "2 + 2"],
              ["three_of_a_kind_3", "3 · 3 · 3"],
              ["three_of_a_kind_4", "4 · 4 · 4"],
            ];
    return entries.map(([id, mark], i) => ({
      id: `${group}_${id}` as CategoryId,
      group,
      x: -5.2 + g * 5.2,
      z: -0.77 + i * 0.86,
      label: mark,
      mark,
    }));
  }),
];
export const slotById = new Map(slots.map((s) => [s.id, s]));
export const TRAY = { x: 0, z: 5.0, width: 12.8, depth: 3.3, floor: 0.18 };
export const SKILL_Z = 2.92;
export const assetUrl = (file: string) =>
  `${import.meta.env.BASE_URL}assets/${file}`;

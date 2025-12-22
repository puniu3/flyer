// ==========================================
// Type Definitions (Pure Data Containers)
// ==========================================

export type CategoryId =
  | 'dungeon_floor_1'
  | 'dungeon_floor_2'
  | 'dungeon_floor_3'
  | 'dungeon_floor_4'
  | 'dungeon_floor_5'
  | 'str_three_of_a_kind_5'
  | 'str_three_of_a_kind_6'
  | 'str_full_house'
  | 'str_four_of_a_kind'
  | 'dex_three_of_a_kind_1'
  | 'dex_three_of_a_kind_2'
  | 'dex_small_straight'
  | 'dex_large_straight'
  | 'int_three_of_a_kind_3'
  | 'int_three_of_a_kind_4'
  | 'int_one_pair'
  | 'int_two_pair';

export type SkillId =
  | 'skill_str_mighty'
  | 'skill_dex_acrobatics'
  | 'skill_int_metamorph';

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type GameStatus = 'playing' | 'won' | 'lost';

export type CategoryGroup = 'dungeon' | 'str' | 'dex' | 'int';

export type SkillStatus = 'locked' | 'available' | 'used';

// ==========================================
// State Interface (Data Container Only)
// ==========================================

export interface GameState {
  categories: Record<CategoryId, boolean>;
  skillsUsed: Record<SkillId, boolean>;
  dice: DieValue[];
  rollsUsed: number;
  status: GameStatus;
}

// ==========================================
// Action Types
// ==========================================

export interface RollDiceAction {
  type: 'roll_dice';
  indexesToReroll: number[];
}

export interface UseSkillAction {
  type: 'use_skill';
  skillId: SkillId;
  targetDieIndex: number;
}

export interface SelectCategoryAction {
  type: 'select_category';
  categoryId: CategoryId;
}

export type PlayerAction =
  | RollDiceAction
  | UseSkillAction
  | SelectCategoryAction;

// ==========================================
// View Models (DTOs for Rendering)
// ==========================================

export interface SkillView {
  id: SkillId;
  name: string;
  status: SkillStatus;
  effectDescription: string;
}

export interface CategoryView {
  id: CategoryId;
  group: CategoryGroup;
  isChecked: boolean;
  isSelectable: boolean;
}

export interface GameView {
  dice: DieValue[];
  rolls: {
    current: number;
    max: number;
    canRoll: boolean;
  };
  skills: Record<SkillId, SkillView>;
  categories: CategoryView[];
  gameStatus: GameStatus;
}

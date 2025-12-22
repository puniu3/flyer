// ==========================================
// Type Definitions
// ==========================================

/**
 * All valid category IDs defined in the YAML.
 */
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

/**
 * Interface representing the raw JSON structure.
 * accurate to how it will look when sent to PHP/Python.
 */
export interface GameStateDTO {
  categories: Record<CategoryId, boolean>;
  skillsUsed: Record<SkillId, boolean>;
  dice: DieValue[];
  rollsUsed: number;
  status: GameStatus;
}

// ==========================================
// State Class
// ==========================================

export class GameState {
  // Use a simple object map (dictionary) instead of Set.
  // This serializes directly to JSON: { "dungeon_floor_1": false, ... }
  public categories: Record<CategoryId, boolean>;

  // Tracks if a skill was used this turn.
  // JSON: { "skill_str_mighty": true, ... }
  public skillsUsed: Record<SkillId, boolean>;

  public dice: DieValue[];
  public rollsUsed: number;
  public status: GameStatus;

  constructor(initialData?: GameStateDTO) {
    if (initialData) {
      // Rehydrate from JSON
      this.categories = { ...initialData.categories };
      this.skillsUsed = { ...initialData.skillsUsed };
      this.dice = [...initialData.dice];
      this.rollsUsed = initialData.rollsUsed;
      this.status = initialData.status;
    } else {
      // Initialize default state
      this.categories = this.createInitialCategories();
      this.skillsUsed = this.createInitialSkills();
      this.dice = [];
      this.rollsUsed = 0;
      this.status = 'playing';
    }
  }

  /**
   * Serializes the current state to a plain JSON-compatible object.
   * Useful for sending to a backend API.
   */
  public toJSON(): GameStateDTO {
    return {
      categories: this.categories,
      skillsUsed: this.skillsUsed,
      dice: this.dice,
      rollsUsed: this.rollsUsed,
      status: this.status,
    };
  }

  // --- Helper Methods ---

  private createInitialCategories(): Record<CategoryId, boolean> {
    return {
      dungeon_floor_1: false,
      dungeon_floor_2: false,
      dungeon_floor_3: false,
      dungeon_floor_4: false,
      dungeon_floor_5: false,
      str_three_of_a_kind_5: false,
      str_three_of_a_kind_6: false,
      str_full_house: false,
      str_four_of_a_kind: false,
      dex_three_of_a_kind_1: false,
      dex_three_of_a_kind_2: false,
      dex_small_straight: false,
      dex_large_straight: false,
      int_three_of_a_kind_3: false,
      int_three_of_a_kind_4: false,
      int_one_pair: false,
      int_two_pair: false,
    };
  }

  private createInitialSkills(): Record<SkillId, boolean> {
    return {
      skill_str_mighty: false,
      skill_dex_acrobatics: false,
      skill_int_metamorph: false,
    };
  }

  // --- Computed Properties (Optional Logic Helpers) ---
  // These are not saved to JSON but help with game logic.

  public getCategoryCount(ids: CategoryId[]): number {
    return ids.reduce((count, id) => (this.categories[id] ? count + 1 : count), 0);
  }

  public resetTurnState(): void {
    this.rollsUsed = 0;
    // Reset skill usage flags to false
    Object.keys(this.skillsUsed).forEach((key) => {
      this.skillsUsed[key as SkillId] = false;
    });
    // Dice are usually kept or cleared depending on UI design
    this.dice = [];
  }
}

// ==========================================
// Action Types
// ==========================================

/**
 * Action: Roll or Reroll Dice
 * Corresponds to the 'roll_phase'.
 * * If it's the first roll of the turn, `indexesToReroll` should theoretically
 * include all indices [0, 1, 2, 3, 4], or the backend can treat an empty
 * dice state as an implicit "roll all".
 */
export interface RollDiceAction {
  type: 'roll_dice';
  /**
   * The indices of the dice to reroll (0-4).
   * Example: [0, 1] means reroll the 1st and 2nd dice, keep others.
   */
  indexesToReroll: number[];
}

/**
 * Action: Use a Skill
 * Corresponds to the 'skill_phase'.
 * * All skills in the YAML (modify_die, invert_die_face) target a specific die,
 * so `targetDieIndex` is required.
 */
export interface UseSkillAction {
  type: 'use_skill';
  skillId: SkillId;
  /**
   * The index of the die to apply the skill to (0-4).
   */
  targetDieIndex: number;
}

/**
 * Action: Select Category (and End Turn)
 * Corresponds to the 'choose_category_phase'.
 * * This action attempts to assign the current dice result to a slot.
 * If valid, the turn ends.
 */
export interface SelectCategoryAction {
  type: 'select_category';
  categoryId: CategoryId;
}

/**
 * The master type representing any move a player can make.
 * Send this object as JSON to your backend.
 */
export type PlayerAction = 
  | RollDiceAction 
  | UseSkillAction 
  | SelectCategoryAction;

// ==========================================
// Example JSON Payloads
// ==========================================

/*
Scenario 1: Reroll the 1st and 5th dice
{
  "type": "roll_dice",
  "indexesToReroll": [0, 4]
}

Scenario 2: Use 'Mighty' skill on the 3rd die
{
  "type": "use_skill",
  "skillId": "skill_str_mighty",
  "targetDieIndex": 2
}

Scenario 3: Check the "Full House" category
{
  "type": "select_category",
  "categoryId": "str_full_house"
}
*/

// ==========================================
// View Models (DTOs for Rendering)
// ==========================================

export type SkillStatus = 'locked' | 'available' | 'used';

export interface SkillView {
  id: SkillId;
  name: string; // Helpful for UI (or map ID to string in client)
  status: SkillStatus;
  effectDescription: string; // Optional: derived from YAML
}

export interface CategoryView {
  id: CategoryId;
  group: 'dungeon' | 'str' | 'dex' | 'int'; // Helpful for UI grouping
  isChecked: boolean;
  /**
   * Crucial: Can the player select this category right now?
   * True if: !isChecked AND dice meet the condition AND rollsUsed == 3 (optional rule) etc.
   */
  isSelectable: boolean; 
}

export interface GameView {
  dice: DieValue[];
  
  rolls: {
    current: number;
    max: number;
    canRoll: boolean; // True if current < max
  };

  skills: Record<SkillId, SkillView>;
  
  // Grouped or flat list, depending on how you render. 
  // Flat list is easier for iteration.
  categories: CategoryView[];

  gameStatus: 'playing' | 'won' | 'lost';
}


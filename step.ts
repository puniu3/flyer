import {
  GameState,
  PlayerAction,
  DieValue,
  CategoryId,
  SkillId,
  GameStateDTO,
  RollDiceAction,
  UseSkillAction,
  SelectCategoryAction
} from './types';

// ==========================================
// Helpers: Dice & Logic
// ==========================================

const generateDieValue = (): DieValue => {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
};

const getDiceSum = (dice: DieValue[]): number => 
  dice.reduce((sum, d) => sum + d, 0);

const getDiceCounts = (dice: DieValue[]): Record<number, number> => {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) {
    counts[d] = (counts[d] || 0) + 1;
  }
  return counts;
};

const getMaxStraightLength = (dice: DieValue[]): number => {
  const unique = Array.from(new Set(dice)).sort((a, b) => a - b);
  let maxSeq = 0;
  let currentSeq = 0;
  let prev: number | null = null;

  for (const val of unique) {
    if (prev === null || val === prev + 1) {
      currentSeq++;
    } else {
      currentSeq = 1;
    }
    maxSeq = Math.max(maxSeq, currentSeq);
    prev = val;
  }
  return maxSeq || (dice.length > 0 ? 1 : 0);
};

const getCategoryGroup = (id: CategoryId): 'dungeon' | 'str' | 'dex' | 'int' => {
  if (id.startsWith('dungeon')) return 'dungeon';
  if (id.startsWith('str')) return 'str';
  if (id.startsWith('dex')) return 'dex';
  if (id.startsWith('int')) return 'int';
  return 'dungeon';
};

/**
 * Checks if the current dice satisfy the condition for a specific category.
 * Logic mirrors the YAML conditions.
 */
const isCategorySatisfied = (
  id: CategoryId,
  dice: DieValue[]
): boolean => {
  if (dice.length === 0) return false;

  const sum = getDiceSum(dice);
  const counts = getDiceCounts(dice);
  const countsValues = Object.values(counts);

  switch (id) {
    case 'dungeon_floor_1': return sum >= 20;
    case 'dungeon_floor_2': return sum >= 24;
    case 'dungeon_floor_3': return sum >= 26;
    case 'dungeon_floor_4': return sum <= 9;
    case 'dungeon_floor_5': return countsValues.includes(5); // Yahtzee

    case 'str_three_of_a_kind_5': return counts[5] >= 3;
    case 'str_three_of_a_kind_6': return counts[6] >= 3;
    case 'str_full_house': 
      const has3 = countsValues.includes(3);
      const has2 = countsValues.includes(2);
      const has5 = countsValues.includes(5);
      return (has3 && has2) || has5;
    case 'str_four_of_a_kind': return countsValues.some(c => c >= 4);

    case 'dex_three_of_a_kind_1': return counts[1] >= 3;
    case 'dex_three_of_a_kind_2': return counts[2] >= 3;
    case 'dex_small_straight': return getMaxStraightLength(dice) >= 4;
    case 'dex_large_straight': return getMaxStraightLength(dice) >= 5;

    case 'int_three_of_a_kind_3': return counts[3] >= 3;
    case 'int_three_of_a_kind_4': return counts[4] >= 3;
    case 'int_one_pair': return countsValues.some(c => c >= 2);
    case 'int_two_pair':
      const pairsCount = countsValues.filter(c => c >= 2).length;
      const fourOfAKind = countsValues.some(c => c >= 4);
      return pairsCount >= 2 || fourOfAKind;
    
    default: return false;
  }
};

/**
 * Checks if a skill is unlocked based on group completion.
 * Requirement: 3 categories checked in the corresponding group.
 */
const isSkillUnlocked = (skillId: SkillId, categories: Record<CategoryId, boolean>): boolean => {
  let groupToCheck: 'str' | 'dex' | 'int';
  
  if (skillId.includes('str')) groupToCheck = 'str';
  else if (skillId.includes('dex')) groupToCheck = 'dex';
  else if (skillId.includes('int')) groupToCheck = 'int';
  else return false;

  const count = Object.keys(categories).filter(catId => 
    getCategoryGroup(catId as CategoryId) === groupToCheck && categories[catId as CategoryId]
  ).length;

  return count >= 3;
};

// ==========================================
// Main Step Function
// ==========================================

export function step(state: GameState, action: PlayerAction): GameState {
  // 1. Clone state (via DTO) to ensure immutability
  const nextDTO: GameStateDTO = state.toJSON();

  // Guard: Cannot perform actions if game is over
  if (nextDTO.status !== 'playing') {
    return new GameState(nextDTO);
  }

  switch (action.type) {
    case 'roll_dice':
      return handleRollDice(nextDTO, action);
    case 'use_skill':
      return handleUseSkill(nextDTO, action);
    case 'select_category':
      return handleSelectCategory(nextDTO, action);
    default:
      return new GameState(nextDTO);
  }
}

// ==========================================
// Action Handlers
// ==========================================

function handleRollDice(state: GameStateDTO, action: RollDiceAction): GameState {
  const MAX_ROLLS = 3;

  if (state.rollsUsed >= MAX_ROLLS) {
    // Cannot roll anymore
    return new GameState(state);
  }

  const isFirstRoll = state.dice.length === 0;
  
  // If it's the first roll, we roll all 5 dice regardless of input
  if (isFirstRoll) {
    state.dice = Array.from({ length: 5 }, () => generateDieValue());
  } else {
    // Reroll specific indices
    action.indexesToReroll.forEach(index => {
      if (index >= 0 && index < state.dice.length) {
        state.dice[index] = generateDieValue();
      }
    });
  }

  state.rollsUsed += 1;

  // check lose condition after roll (if rolls are exhausted and no moves possible)
  checkLoseCondition(state);

  return new GameState(state);
}

function handleUseSkill(state: GameStateDTO, action: UseSkillAction): GameState {
  const { skillId, targetDieIndex } = action;

  // Validation: Index bounds
  if (targetDieIndex < 0 || targetDieIndex >= state.dice.length) {
    return new GameState(state);
  }

  // Validation: Already used this turn?
  if (state.skillsUsed[skillId]) {
    return new GameState(state);
  }

  // Validation: Is skill unlocked?
  if (!isSkillUnlocked(skillId, state.categories)) {
    return new GameState(state);
  }

  // Apply Effect
  const currentVal = state.dice[targetDieIndex];

  if (skillId === 'skill_str_mighty') {
    state.dice[targetDieIndex] = 6;
  } else if (skillId === 'skill_dex_acrobatics') {
    state.dice[targetDieIndex] = Math.max(1, currentVal - 1) as DieValue;
  } else if (skillId === 'skill_int_metamorph') {
    // Invert: 1->6, 2->5, 3->4 => 7 - value
    state.dice[targetDieIndex] = (7 - currentVal) as DieValue;
  }

  // Mark as used
  state.skillsUsed[skillId] = true;

  // Skills might change dice to a winning state, or a losing state if rolls are out.
  // Re-evaluate lose condition just in case (though typically checked after roll)
  checkLoseCondition(state);

  return new GameState(state);
}

function handleSelectCategory(state: GameStateDTO, action: SelectCategoryAction): GameState {
  const { categoryId } = action;

  // Validation: Already checked?
  if (state.categories[categoryId]) {
    return new GameState(state);
  }

  // Validation: Prerequisite met? (Specifically for dungeon floors)
  const prereqMap: Partial<Record<CategoryId, CategoryId>> = {
    dungeon_floor_2: 'dungeon_floor_1',
    dungeon_floor_3: 'dungeon_floor_2',
    dungeon_floor_4: 'dungeon_floor_3',
    dungeon_floor_5: 'dungeon_floor_4',
  };
  const prereq = prereqMap[categoryId];
  if (prereq && !state.categories[prereq]) {
    return new GameState(state);
  }

  // Validation: Dice condition met?
  if (!isCategorySatisfied(categoryId, state.dice)) {
    // In strict mode (YAML), you cannot select a category if condition is not met.
    return new GameState(state);
  }

  // --- Success: Update State ---
  
  // 1. Mark category
  state.categories[categoryId] = true;

  // 2. Check Win Condition
  // YAML: Win if dungeon_floor_5 is checked.
  if (categoryId === 'dungeon_floor_5') {
    state.status = 'won';
    return new GameState(state);
  }

  // 3. Prepare for Next Turn
  state.rollsUsed = 0;
  state.dice = []; // Clear dice
  // Reset skills for next turn
  (Object.keys(state.skillsUsed) as SkillId[]).forEach(k => {
    state.skillsUsed[k] = false;
  });

  return new GameState(state);
}

// ==========================================
// Lose Condition Check
// ==========================================

function checkLoseCondition(state: GameStateDTO): void {
  // YAML Lose Condition: "no_valid_categories_remaining_this_turn"
  // This implies: If rollsUsed == MAX AND no category can be selected with current dice.
  
  if (state.rollsUsed < 3) return;

  const allCategoryIds = Object.keys(state.categories) as CategoryId[];
  
  // Find at least one valid move
  const hasValidMove = allCategoryIds.some(id => {
    if (state.categories[id]) return false; // Already checked

    // Check prerequisites
    const prereqMap: Partial<Record<CategoryId, CategoryId>> = {
      dungeon_floor_2: 'dungeon_floor_1',
      dungeon_floor_3: 'dungeon_floor_2',
      dungeon_floor_4: 'dungeon_floor_3',
      dungeon_floor_5: 'dungeon_floor_4',
    };
    const prereq = prereqMap[id];
    if (prereq && !state.categories[prereq]) return false;

    // Check dice condition
    return isCategorySatisfied(id, state.dice);
  });

  if (!hasValidMove) {
    state.status = 'lost';
  }
}

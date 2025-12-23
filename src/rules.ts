import {
  GameState,
  GameView,
  CategoryId,
  SkillId,
  DieValue,
  CategoryView,
  SkillView,
  SkillStatus,
  CategoryGroup,
  PlayerAction,
  RollDiceAction,
  UseSkillAction,
  SelectCategoryAction,
} from './types';

// ==========================================
// Constants
// ==========================================

const MAX_ROLLS = 3;
const SKILL_UNLOCK_THRESHOLD = 3;

const ALL_CATEGORY_IDS: CategoryId[] = [
  'dungeon_floor_1',
  'dungeon_floor_2',
  'dungeon_floor_3',
  'dungeon_floor_4',
  'dungeon_floor_5',
  'str_full_house',
  'str_four_of_a_kind',
  'str_three_of_a_kind_5',
  'str_three_of_a_kind_6',
  'dex_free',
  'dex_straight',
  'dex_three_of_a_kind_1',
  'dex_three_of_a_kind_2',
  'int_one_pair',
  'int_two_pair',
  'int_three_of_a_kind_3',
  'int_three_of_a_kind_4',
];

const ALL_SKILL_IDS: SkillId[] = [
  'skill_str_mighty',
  'skill_dex_acrobatics',
  'skill_int_metamorph',
];

const DUNGEON_PREREQUISITES: Partial<Record<CategoryId, CategoryId>> = {
  dungeon_floor_2: 'dungeon_floor_1',
  dungeon_floor_3: 'dungeon_floor_2',
  dungeon_floor_4: 'dungeon_floor_3',
  dungeon_floor_5: 'dungeon_floor_4',
};

const SKILL_CONFIG: Record<SkillId, { name: string; desc: string; group: CategoryGroup }> = {
  skill_str_mighty: { name: 'Mighty', desc: 'Set a die to 6', group: 'str' },
  skill_dex_acrobatics: { name: 'Acrobatics', desc: 'Reduce die value by 1 (min 1)', group: 'dex' },
  skill_int_metamorph: { name: 'Metamorph', desc: 'Flip a die (1<->6, 2<->5, 3<->4)', group: 'int' },
};

// ==========================================
// Initialization
// ==========================================

export function init(): GameState {
  const categories = {} as Record<CategoryId, boolean>;
  for (const id of ALL_CATEGORY_IDS) {
    categories[id] = false;
  }

  const skillsUsed = {} as Record<SkillId, boolean>;
  for (const id of ALL_SKILL_IDS) {
    skillsUsed[id] = false;
  }

  return {
    categories,
    skillsUsed,
    dice: [],
    rollsUsed: 0,
    status: 'playing',
  };
}

// ==========================================
// Dice Helpers (Pure Functions)
// ==========================================

function getDiceSum(dice: DieValue[]): number {
  return dice.reduce((sum, d) => sum + d, 0);
}

function getDiceCounts(dice: DieValue[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) {
    counts[d] = (counts[d] || 0) + 1;
  }
  return counts;
}

function getMaxStraightLength(dice: DieValue[]): number {
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
}

function generateDieValue(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

// ==========================================
// Category Helpers (Pure Functions)
// ==========================================

function getCategoryGroup(id: CategoryId): CategoryGroup {
  if (id.startsWith('dungeon')) return 'dungeon';
  if (id.startsWith('str')) return 'str';
  if (id.startsWith('dex')) return 'dex';
  if (id.startsWith('int')) return 'int';
  return 'dungeon';
}

function getPrerequisite(id: CategoryId): CategoryId | null {
  return DUNGEON_PREREQUISITES[id] ?? null;
}

function isCategorySatisfied(id: CategoryId, dice: DieValue[]): boolean {
  if (dice.length === 0) return false;

  const sum = getDiceSum(dice);
  const counts = getDiceCounts(dice);
  const countsValues = Object.values(counts);

  switch (id) {
    case 'dungeon_floor_1':
      return sum >= 20;
    case 'dungeon_floor_2':
      return sum >= 24;
    case 'dungeon_floor_3':
      return sum >= 26;
    case 'dungeon_floor_4':
      return sum <= 9;
    case 'dungeon_floor_5':
      return countsValues.includes(5);

    case 'str_full_house': {
      const has3 = countsValues.includes(3);
      const has2 = countsValues.includes(2);
      const has5 = countsValues.includes(5);
      return (has3 && has2) || has5;
    }
    case 'str_four_of_a_kind':
      return countsValues.some((c) => c >= 4);
    case 'str_three_of_a_kind_5':
      return counts[5] >= 3;
    case 'str_three_of_a_kind_6':
      return counts[6] >= 3;

    case 'dex_free':
      return sum >= 0;
    case 'dex_straight':
      return getMaxStraightLength(dice) >= 5;
    case 'dex_three_of_a_kind_1':
      return counts[1] >= 3;
    case 'dex_three_of_a_kind_2':
      return counts[2] >= 3;

    case 'int_one_pair':
      return countsValues.some((c) => c >= 2);
    case 'int_two_pair': {
      const pairsCount = countsValues.filter((c) => c >= 2).length;
      const fourOfAKind = countsValues.some((c) => c >= 4);
      return pairsCount >= 2 || fourOfAKind;
    }
    case 'int_three_of_a_kind_3':
      return counts[3] >= 3;
    case 'int_three_of_a_kind_4':
      return counts[4] >= 3;

    default:
      return false;
  }
}

// ==========================================
// Skill Helpers (Pure Functions)
// ==========================================

function getSkillGroup(skillId: SkillId): CategoryGroup {
  if (skillId.includes('str')) return 'str';
  if (skillId.includes('dex')) return 'dex';
  if (skillId.includes('int')) return 'int';
  return 'str';
}

function applySkillEffect(skillId: SkillId, dieValue: DieValue): DieValue {
  if (skillId === 'skill_str_mighty') {
    return 6;
  } else if (skillId === 'skill_dex_acrobatics') {
    return Math.max(1, dieValue - 1) as DieValue;
  } else {
    // skill_int_metamorph
    return (7 - dieValue) as DieValue;
  }
}

function countCheckedByGroup(categories: Record<CategoryId, boolean>): Record<CategoryGroup, number> {
  const counts: Record<CategoryGroup, number> = { dungeon: 0, str: 0, dex: 0, int: 0 };
  for (const id of ALL_CATEGORY_IDS) {
    if (categories[id]) {
      counts[getCategoryGroup(id)]++;
    }
  }
  return counts;
}

function isSkillUnlocked(skillId: SkillId, categories: Record<CategoryId, boolean>): boolean {
  const group = getSkillGroup(skillId);
  const counts = countCheckedByGroup(categories);
  return counts[group] >= SKILL_UNLOCK_THRESHOLD;
}

// ==========================================
// View Generation (Pure Function)
// ==========================================

export function getView(state: GameState): GameView {
  const { categories, skillsUsed, dice, rollsUsed, status } = state;

  const groupCounts = countCheckedByGroup(categories);

  const categoryViews: CategoryView[] = ALL_CATEGORY_IDS.map((id) => {
    const isChecked = categories[id];
    const group = getCategoryGroup(id);

    let isSelectable = false;
    if (!isChecked && status === 'playing') {
      const conditionMet = isCategorySatisfied(id, dice);
      const prereqId = getPrerequisite(id);
      const prereqMet = prereqId ? categories[prereqId] : true;
      isSelectable = conditionMet && prereqMet;
    }

    return { id, group, isChecked, isSelectable };
  });

  const skills = {} as Record<SkillId, SkillView>;
  for (const id of ALL_SKILL_IDS) {
    const config = SKILL_CONFIG[id];
    const isUsed = skillsUsed[id];

    let skillStatus: SkillStatus = 'locked';
    if (isUsed) {
      skillStatus = 'used';
    } else if (groupCounts[config.group] >= SKILL_UNLOCK_THRESHOLD) {
      skillStatus = 'available';
    }

    skills[id] = {
      id,
      name: config.name,
      status: skillStatus,
      effectDescription: config.desc,
    };
  }

  const canRoll = status === 'playing' && rollsUsed < MAX_ROLLS;

  return {
    dice: [...dice],
    rolls: {
      current: rollsUsed,
      max: MAX_ROLLS,
      canRoll,
    },
    skills,
    categories: categoryViews,
    gameStatus: status,
  };
}

// ==========================================
// Lose Condition Check (Pure Function)
// ==========================================

// Helper: Check if the current dice configuration allows taking any valid category
function canTakeAnyCategory(dice: DieValue[], categories: Record<CategoryId, boolean>): boolean {
  for (const id of ALL_CATEGORY_IDS) {
    if (categories[id]) continue;

    const prereq = getPrerequisite(id);
    if (prereq && !categories[prereq]) continue;

    if (isCategorySatisfied(id, dice)) {
      return true;
    }
  }
  return false;
}

// Helper: Recursively check if any sequence of remaining skills leads to a winning state
function canReachValidState(
  dice: DieValue[],
  availableSkills: SkillId[],
  categories: Record<CategoryId, boolean>
): boolean {
  // 1. Base Case: If current dice can take a category, we found a solution.
  if (canTakeAnyCategory(dice, categories)) {
    return true;
  }

  // 2. Recursive Step: Try applying each available skill to each die
  for (let i = 0; i < availableSkills.length; i++) {
    const skillId = availableSkills[i];
    
    // Create a new list of available skills without the current one
    const remainingSkills = [...availableSkills];
    remainingSkills.splice(i, 1);

    // Try applying this skill to every die (index 0 to 4)
    for (let dieIndex = 0; dieIndex < dice.length; dieIndex++) {
      const currentVal = dice[dieIndex];
      const newVal = applySkillEffect(skillId, currentVal);

      // Optimization: If the die value didn't change (e.g. Mighty on a 6), skip this branch
      if (newVal === currentVal) continue;

      const nextDice = [...dice];
      nextDice[dieIndex] = newVal;

      // Recurse
      if (canReachValidState(nextDice, remainingSkills, categories)) {
        return true;
      }
    }
  }

  return false;
}

function hasValidMove(state: GameState): boolean {
  const { categories, dice, skillsUsed } = state;

  // 1. Identify all skills that are unlocked and unused
  const availableSkills: SkillId[] = [];
  for (const skillId of ALL_SKILL_IDS) {
    if (!skillsUsed[skillId] && isSkillUnlocked(skillId, categories)) {
      availableSkills.push(skillId);
    }
  }

  // 2. Start the recursive search
  // It checks if current state is valid, OR if any combination of skills makes it valid.
  return canReachValidState(dice, availableSkills, categories);
}

function checkLoseCondition(state: GameState): GameState {
  if (state.rollsUsed < MAX_ROLLS) return state;
  if (hasValidMove(state)) return state;

  return { ...state, status: 'lost' };
}

// ==========================================
// Action Handlers (Pure Functions)
// ==========================================

function handleRollDice(state: GameState, action: RollDiceAction): GameState {
  if (state.rollsUsed >= MAX_ROLLS) {
    return state;
  }

  const isFirstRoll = state.dice.length === 0;
  let newDice: DieValue[];

  if (isFirstRoll) {
    newDice = Array.from({ length: 5 }, () => generateDieValue());
  } else {
    newDice = [...state.dice];
    for (const index of action.indexesToReroll) {
      if (index >= 0 && index < newDice.length) {
        newDice[index] = generateDieValue();
      }
    }
  }

  const nextState: GameState = {
    ...state,
    dice: newDice,
    rollsUsed: state.rollsUsed + 1,
  };

  return checkLoseCondition(nextState);
}

function handleUseSkill(state: GameState, action: UseSkillAction): GameState {
  const { skillId, targetDieIndex } = action;

  if (targetDieIndex < 0 || targetDieIndex >= state.dice.length) {
    return state;
  }

  if (state.skillsUsed[skillId]) {
    return state;
  }

  if (!isSkillUnlocked(skillId, state.categories)) {
    return state;
  }

  const currentVal = state.dice[targetDieIndex];
  const newVal = applySkillEffect(skillId, currentVal);

  const newDice = [...state.dice];
  newDice[targetDieIndex] = newVal;

  const nextState: GameState = {
    ...state,
    dice: newDice,
    skillsUsed: { ...state.skillsUsed, [skillId]: true },
  };

  return checkLoseCondition(nextState);
}

function handleSelectCategory(state: GameState, action: SelectCategoryAction): GameState {
  const { categoryId } = action;

  if (state.categories[categoryId]) {
    return state;
  }

  const prereq = getPrerequisite(categoryId);
  if (prereq && !state.categories[prereq]) {
    return state;
  }

  if (!isCategorySatisfied(categoryId, state.dice)) {
    return state;
  }

  const newCategories = { ...state.categories, [categoryId]: true };

  if (categoryId === 'dungeon_floor_5') {
    return { ...state, categories: newCategories, status: 'won' };
  }

  const resetSkills = {} as Record<SkillId, boolean>;
  for (const id of ALL_SKILL_IDS) {
    resetSkills[id] = false;
  }

  return {
    ...state,
    categories: newCategories,
    skillsUsed: resetSkills,
    dice: [],
    rollsUsed: 0,
  };
}

// ==========================================
// Step Function (Pure Function)
// ==========================================

export function step(state: GameState, action: PlayerAction): GameState {
  if (state.status !== 'playing') {
    return state;
  }

  switch (action.type) {
    case 'roll_dice':
      return handleRollDice(state, action);
    case 'use_skill':
      return handleUseSkill(state, action);
    case 'select_category':
      return handleSelectCategory(state, action);
    default:
      return state;
  }
}

import { 
  GameState, 
  GameView, 
  CategoryId, 
  SkillId, 
  DieValue, 
  CategoryView, 
  SkillView, 
  SkillStatus 
} from './types';

// ==========================================
// Helpers: Dice Logic
// ==========================================

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

// ==========================================
// Logic: Category Conditions (from YAML)
// ==========================================

const checkCategoryCondition = (
  id: CategoryId, 
  dice: DieValue[], 
  categories: Record<CategoryId, boolean>
): boolean => {
  // If no dice, conditions generally fail (prevents checking before rolling)
  if (dice.length === 0) return false;

  const sum = getDiceSum(dice);
  const counts = getDiceCounts(dice);
  const countsValues = Object.values(counts);

  switch (id) {
    // --- Dungeon Floor (Progressive Difficulty) ---
    case 'dungeon_floor_1':
      // Sum >= 20
      return sum >= 20;
    case 'dungeon_floor_2':
      // Prerequisite: Floor 1 checked (handled in isSelectable), Sum >= 24
      return sum >= 24;
    case 'dungeon_floor_3':
      // Sum >= 26
      return sum >= 26;
    case 'dungeon_floor_4':
      // Sum <= 9
      return sum <= 9;
    case 'dungeon_floor_5':
      // Yahtzee (All 5 dice same)
      return countsValues.includes(5);

    // --- STR (Power / High Numbers) ---
    case 'str_three_of_a_kind_5':
      return counts[5] >= 3;
    case 'str_three_of_a_kind_6':
      return counts[6] >= 3;
    case 'str_full_house':
      // 3 of one, 2 of another OR 5 of a kind (technically a full house in some rules, 
      // but usually defined as count(3) and count(2)).
      // Standard Yahtzee often accepts 5-of-a-kind as Full House.
      // Strict check: One count >= 3 AND another count >= 2 (if distinct).
      // Logic: 3 & 2, or 5.
      const has3 = countsValues.includes(3);
      const has2 = countsValues.includes(2);
      const has5 = countsValues.includes(5);
      return (has3 && has2) || has5; 
    case 'str_four_of_a_kind':
      return countsValues.some(c => c >= 4);

    // --- DEX (Speed / Straights / Low Numbers) ---
    case 'dex_three_of_a_kind_1':
      return counts[1] >= 3;
    case 'dex_three_of_a_kind_2':
      return counts[2] >= 3;
    case 'dex_small_straight':
      // Length >= 4
      return getMaxStraightLength(dice) >= 4;
    case 'dex_large_straight':
      // Length >= 5
      return getMaxStraightLength(dice) >= 5;

    // --- INT (Manipulation / Pairs / Mids) ---
    case 'int_three_of_a_kind_3':
      return counts[3] >= 3;
    case 'int_three_of_a_kind_4':
      return counts[4] >= 3;
    case 'int_one_pair':
      // At least one pair
      return countsValues.some(c => c >= 2);
    case 'int_two_pair':
      // YAML: "allow_four_of_a_kind_as_two_pair: true"
      const pairsCount = countsValues.filter(c => c >= 2).length;
      const fourOfAKind = countsValues.some(c => c >= 4);
      return pairsCount >= 2 || fourOfAKind;

    default:
      return false;
  }
};

const getCategoryGroup = (id: CategoryId): 'dungeon' | 'str' | 'dex' | 'int' => {
  if (id.startsWith('dungeon')) return 'dungeon';
  if (id.startsWith('str')) return 'str';
  if (id.startsWith('dex')) return 'dex';
  if (id.startsWith('int')) return 'int';
  return 'dungeon'; // fallback
};

const getPrerequisite = (id: CategoryId): CategoryId | null => {
  switch (id) {
    case 'dungeon_floor_2': return 'dungeon_floor_1';
    case 'dungeon_floor_3': return 'dungeon_floor_2';
    case 'dungeon_floor_4': return 'dungeon_floor_3';
    case 'dungeon_floor_5': return 'dungeon_floor_4';
    default: return null;
  }
};

// ==========================================
// Logic: Skills (from YAML)
// ==========================================

const getSkillConfig = (id: SkillId) => {
  switch (id) {
    case 'skill_str_mighty':
      return { 
        name: 'Mighty', 
        desc: 'Set a die to 6', 
        group: 'str' as const 
      };
    case 'skill_dex_acrobatics':
      return { 
        name: 'Acrobatics', 
        desc: 'Reduce die value by 1 (min 1)', 
        group: 'dex' as const 
      };
    case 'skill_int_metamorph':
      return { 
        name: 'Metamorph', 
        desc: 'Flip a die (1<->6, 2<->5, 3<->4)', 
        group: 'int' as const 
      };
  }
};

// ==========================================
// Main Function: getView
// ==========================================

export function getView(state: GameState): GameView {
  const { categories, skillsUsed, dice, rollsUsed, status } = state;

  // 1. Build Categories View
  const categoryIds = Object.keys(categories) as CategoryId[];
  
  // Helper to count checked categories per group (for skill unlocking)
  const groupCounts = { str: 0, dex: 0, int: 0, dungeon: 0 };

  const categoryViews: CategoryView[] = categoryIds.map((id) => {
    const isChecked = categories[id];
    const group = getCategoryGroup(id);
    
    // Update group counts for skill unlocking logic later
    if (isChecked) {
      groupCounts[group]++;
    }

    // Determine if selectable
    let isSelectable = false;
    
    if (!isChecked && status === 'playing') {
      // Rule 1: Must satisfy dice condition
      const conditionMet = checkCategoryCondition(id, dice, categories);
      
      // Rule 2: Must satisfy prerequisite (for dungeon floors)
      const prereqId = getPrerequisite(id);
      const prereqMet = prereqId ? categories[prereqId] : true;

      isSelectable = conditionMet && prereqMet;
    }

    return {
      id,
      group,
      isChecked,
      isSelectable
    };
  });

  // 2. Build Skills View
  const skillIds = Object.keys(skillsUsed) as SkillId[];
  const skillViews: Record<string, SkillView> = {};

  skillIds.forEach((id) => {
    const config = getSkillConfig(id);
    const isUsed = skillsUsed[id];
    
    let skillStatus: SkillStatus = 'locked';

    // YAML Logic: Unlock condition is 3 checked categories in the respective group
    const requiredCount = 3;
    const currentCount = groupCounts[config.group];

    if (isUsed) {
      skillStatus = 'used';
    } else if (currentCount >= requiredCount) {
      skillStatus = 'available';
    } else {
      skillStatus = 'locked';
    }

    skillViews[id] = {
      id,
      name: config.name,
      status: skillStatus,
      effectDescription: config.desc
    };
  });

  // 3. Rolls Info
  const maxRolls = 3; // From YAML turn_structure
  const canRoll = status === 'playing' && rollsUsed < maxRolls;

  return {
    dice: [...dice],
    rolls: {
      current: rollsUsed,
      max: maxRolls,
      canRoll
    },
    skills: skillViews as Record<SkillId, SkillView>,
    categories: categoryViews,
    gameStatus: status
  };
}
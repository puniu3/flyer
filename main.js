// src/rules.ts
var MAX_ROLLS = 3;
var SKILL_UNLOCK_THRESHOLD = 3;
var ALL_CATEGORY_IDS = [
  "dungeon_floor_1",
  "dungeon_floor_2",
  "dungeon_floor_3",
  "dungeon_floor_4",
  "dungeon_floor_5",
  "str_three_of_a_kind_5",
  "str_three_of_a_kind_6",
  "str_full_house",
  "str_four_of_a_kind",
  "dex_three_of_a_kind_1",
  "dex_three_of_a_kind_2",
  "dex_small_straight",
  "dex_large_straight",
  "int_three_of_a_kind_3",
  "int_three_of_a_kind_4",
  "int_one_pair",
  "int_two_pair"
];
var ALL_SKILL_IDS = [
  "skill_str_mighty",
  "skill_dex_acrobatics",
  "skill_int_metamorph"
];
var DUNGEON_PREREQUISITES = {
  dungeon_floor_2: "dungeon_floor_1",
  dungeon_floor_3: "dungeon_floor_2",
  dungeon_floor_4: "dungeon_floor_3",
  dungeon_floor_5: "dungeon_floor_4"
};
var SKILL_CONFIG = {
  skill_str_mighty: { name: "Mighty", desc: "Set a die to 6", group: "str" },
  skill_dex_acrobatics: { name: "Acrobatics", desc: "Reduce die value by 1 (min 1)", group: "dex" },
  skill_int_metamorph: { name: "Metamorph", desc: "Flip a die (1<->6, 2<->5, 3<->4)", group: "int" }
};
function init() {
  const categories = {};
  for (const id of ALL_CATEGORY_IDS) {
    categories[id] = false;
  }
  const skillsUsed = {};
  for (const id of ALL_SKILL_IDS) {
    skillsUsed[id] = false;
  }
  return {
    categories,
    skillsUsed,
    dice: [],
    rollsUsed: 0,
    status: "playing"
  };
}
function getDiceSum(dice) {
  return dice.reduce((sum, d) => sum + d, 0);
}
function getDiceCounts(dice) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const d of dice) {
    counts[d] = (counts[d] || 0) + 1;
  }
  return counts;
}
function getMaxStraightLength(dice) {
  const unique = Array.from(new Set(dice)).sort((a, b) => a - b);
  let maxSeq = 0;
  let currentSeq = 0;
  let prev = null;
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
function generateDieValue() {
  return Math.floor(Math.random() * 6) + 1;
}
function getCategoryGroup(id) {
  if (id.startsWith("dungeon")) return "dungeon";
  if (id.startsWith("str")) return "str";
  if (id.startsWith("dex")) return "dex";
  if (id.startsWith("int")) return "int";
  return "dungeon";
}
function getPrerequisite(id) {
  return DUNGEON_PREREQUISITES[id] ?? null;
}
function isCategorySatisfied(id, dice) {
  if (dice.length === 0) return false;
  const sum = getDiceSum(dice);
  const counts = getDiceCounts(dice);
  const countsValues = Object.values(counts);
  switch (id) {
    case "dungeon_floor_1":
      return sum >= 20;
    case "dungeon_floor_2":
      return sum >= 24;
    case "dungeon_floor_3":
      return sum >= 26;
    case "dungeon_floor_4":
      return sum <= 9;
    case "dungeon_floor_5":
      return countsValues.includes(5);
    case "str_three_of_a_kind_5":
      return counts[5] >= 3;
    case "str_three_of_a_kind_6":
      return counts[6] >= 3;
    case "str_full_house": {
      const has3 = countsValues.includes(3);
      const has2 = countsValues.includes(2);
      const has5 = countsValues.includes(5);
      return has3 && has2 || has5;
    }
    case "str_four_of_a_kind":
      return countsValues.some((c) => c >= 4);
    case "dex_three_of_a_kind_1":
      return counts[1] >= 3;
    case "dex_three_of_a_kind_2":
      return counts[2] >= 3;
    case "dex_small_straight":
      return getMaxStraightLength(dice) >= 4;
    case "dex_large_straight":
      return getMaxStraightLength(dice) >= 5;
    case "int_three_of_a_kind_3":
      return counts[3] >= 3;
    case "int_three_of_a_kind_4":
      return counts[4] >= 3;
    case "int_one_pair":
      return countsValues.some((c) => c >= 2);
    case "int_two_pair": {
      const pairsCount = countsValues.filter((c) => c >= 2).length;
      const fourOfAKind = countsValues.some((c) => c >= 4);
      return pairsCount >= 2 || fourOfAKind;
    }
    default:
      return false;
  }
}
function getSkillGroup(skillId) {
  if (skillId.includes("str")) return "str";
  if (skillId.includes("dex")) return "dex";
  if (skillId.includes("int")) return "int";
  return "str";
}
function countCheckedByGroup(categories) {
  const counts = { dungeon: 0, str: 0, dex: 0, int: 0 };
  for (const id of ALL_CATEGORY_IDS) {
    if (categories[id]) {
      counts[getCategoryGroup(id)]++;
    }
  }
  return counts;
}
function isSkillUnlocked(skillId, categories) {
  const group = getSkillGroup(skillId);
  const counts = countCheckedByGroup(categories);
  return counts[group] >= SKILL_UNLOCK_THRESHOLD;
}
function getView(state2) {
  const { categories, skillsUsed, dice, rollsUsed, status } = state2;
  const groupCounts = countCheckedByGroup(categories);
  const categoryViews = ALL_CATEGORY_IDS.map((id) => {
    const isChecked = categories[id];
    const group = getCategoryGroup(id);
    let isSelectable = false;
    if (!isChecked && status === "playing") {
      const conditionMet = isCategorySatisfied(id, dice);
      const prereqId = getPrerequisite(id);
      const prereqMet = prereqId ? categories[prereqId] : true;
      isSelectable = conditionMet && prereqMet;
    }
    return { id, group, isChecked, isSelectable };
  });
  const skills = {};
  for (const id of ALL_SKILL_IDS) {
    const config = SKILL_CONFIG[id];
    const isUsed = skillsUsed[id];
    let skillStatus = "locked";
    if (isUsed) {
      skillStatus = "used";
    } else if (groupCounts[config.group] >= SKILL_UNLOCK_THRESHOLD) {
      skillStatus = "available";
    }
    skills[id] = {
      id,
      name: config.name,
      status: skillStatus,
      effectDescription: config.desc
    };
  }
  const canRoll = status === "playing" && rollsUsed < MAX_ROLLS;
  return {
    dice: [...dice],
    rolls: {
      current: rollsUsed,
      max: MAX_ROLLS,
      canRoll
    },
    skills,
    categories: categoryViews,
    gameStatus: status
  };
}
function hasValidMove(state2) {
  const { categories, dice } = state2;
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
function checkLoseCondition(state2) {
  if (state2.rollsUsed < MAX_ROLLS) return state2;
  if (hasValidMove(state2)) return state2;
  return { ...state2, status: "lost" };
}
function handleRollDice(state2, action) {
  if (state2.rollsUsed >= MAX_ROLLS) {
    return state2;
  }
  const isFirstRoll = state2.dice.length === 0;
  let newDice;
  if (isFirstRoll) {
    newDice = Array.from({ length: 5 }, () => generateDieValue());
  } else {
    newDice = [...state2.dice];
    for (const index of action.indexesToReroll) {
      if (index >= 0 && index < newDice.length) {
        newDice[index] = generateDieValue();
      }
    }
  }
  const nextState = {
    ...state2,
    dice: newDice,
    rollsUsed: state2.rollsUsed + 1
  };
  return checkLoseCondition(nextState);
}
function handleUseSkill(state2, action) {
  const { skillId, targetDieIndex } = action;
  if (targetDieIndex < 0 || targetDieIndex >= state2.dice.length) {
    return state2;
  }
  if (state2.skillsUsed[skillId]) {
    return state2;
  }
  if (!isSkillUnlocked(skillId, state2.categories)) {
    return state2;
  }
  const currentVal = state2.dice[targetDieIndex];
  let newVal;
  if (skillId === "skill_str_mighty") {
    newVal = 6;
  } else if (skillId === "skill_dex_acrobatics") {
    newVal = Math.max(1, currentVal - 1);
  } else {
    newVal = 7 - currentVal;
  }
  const newDice = [...state2.dice];
  newDice[targetDieIndex] = newVal;
  const nextState = {
    ...state2,
    dice: newDice,
    skillsUsed: { ...state2.skillsUsed, [skillId]: true }
  };
  return checkLoseCondition(nextState);
}
function handleSelectCategory(state2, action) {
  const { categoryId } = action;
  if (state2.categories[categoryId]) {
    return state2;
  }
  const prereq = getPrerequisite(categoryId);
  if (prereq && !state2.categories[prereq]) {
    return state2;
  }
  if (!isCategorySatisfied(categoryId, state2.dice)) {
    return state2;
  }
  const newCategories = { ...state2.categories, [categoryId]: true };
  if (categoryId === "dungeon_floor_5") {
    return { ...state2, categories: newCategories, status: "won" };
  }
  const resetSkills = {};
  for (const id of ALL_SKILL_IDS) {
    resetSkills[id] = false;
  }
  return {
    ...state2,
    categories: newCategories,
    skillsUsed: resetSkills,
    dice: [],
    rollsUsed: 0
  };
}
function step(state2, action) {
  if (state2.status !== "playing") {
    return state2;
  }
  switch (action.type) {
    case "roll_dice":
      return handleRollDice(state2, action);
    case "use_skill":
      return handleUseSkill(state2, action);
    case "select_category":
      return handleSelectCategory(state2, action);
    default:
      return state2;
  }
}

// src/renderer.ts
var Renderer = class {
  constructor(root2, onRoll2, onReroll2, onUseSkill2, onSelectCategory2) {
    this.root = root2;
    this.onRoll = onRoll2;
    this.onReroll = onReroll2;
    this.onUseSkill = onUseSkill2;
    this.onSelectCategory = onSelectCategory2;
  }
  update(view) {
    if (!this.root) return;
  }
};

// src/main.ts
var root = document.getElementById("fd-stage");
var state = init();
var renderer = new Renderer(root, onRoll, onReroll, onUseSkill, onSelectCategory);
renderer.update(getView(state));
function handleInput(action) {
  state = step(state, action);
  const view = getView(state);
  renderer.update(view);
}
function onRoll() {
  handleInput({
    type: "roll_dice",
    indexesToReroll: [0, 1, 2, 3, 4]
  });
}
function onReroll(indexesToReroll) {
  handleInput({
    type: "roll_dice",
    indexesToReroll
  });
}
function onUseSkill(skillId, targetDieIndex) {
  handleInput({
    type: "use_skill",
    skillId,
    targetDieIndex
  });
}
function onSelectCategory(categoryId) {
  handleInput({
    type: "select_category",
    categoryId
  });
}

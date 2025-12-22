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
function canTakeAnyCategory(dice, categories) {
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
function canReachValidState(dice, availableSkills, categories) {
  if (canTakeAnyCategory(dice, categories)) {
    return true;
  }
  for (let i = 0; i < availableSkills.length; i++) {
    const skillId = availableSkills[i];
    const remainingSkills = [...availableSkills];
    remainingSkills.splice(i, 1);
    for (let dieIndex = 0; dieIndex < dice.length; dieIndex++) {
      const currentVal = dice[dieIndex];
      let newVal = currentVal;
      if (skillId === "skill_str_mighty") {
        newVal = 6;
      } else if (skillId === "skill_dex_acrobatics") {
        newVal = Math.max(1, currentVal - 1);
      } else if (skillId === "skill_int_metamorph") {
        newVal = 7 - currentVal;
      }
      if (newVal === currentVal) continue;
      const nextDice = [...dice];
      nextDice[dieIndex] = newVal;
      if (canReachValidState(nextDice, remainingSkills, categories)) {
        return true;
      }
    }
  }
  return false;
}
function hasValidMove(state2) {
  const { categories, dice, skillsUsed } = state2;
  const availableSkills = [];
  for (const skillId of ALL_SKILL_IDS) {
    if (!skillsUsed[skillId] && isSkillUnlocked(skillId, categories)) {
      availableSkills.push(skillId);
    }
  }
  return canReachValidState(dice, availableSkills, categories);
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
    this.selectedDiceIndices = /* @__PURE__ */ new Set();
    this.selectedSkillId = null;
    this.root = root2;
    this.onRoll = onRoll2;
    this.onReroll = onReroll2;
    this.onUseSkill = onUseSkill2;
    this.onSelectCategory = onSelectCategory2;
  }
  update(view) {
    this.selectedDiceIndices.clear();
    this.selectedSkillId = null;
    this.render(view);
  }
  render(view) {
    this.root.innerHTML = "";
    const header = document.createElement("header");
    header.innerHTML = `<h1>Flyer Dungeon</h1>`;
    this.root.appendChild(header);
    const statusDiv = document.createElement("div");
    statusDiv.className = `game-status status-${view.gameStatus}`;
    let statusText = "Playing";
    if (view.gameStatus === "won") statusText = "You Won! \u{1F389}";
    if (view.gameStatus === "lost") statusText = "Game Over \u{1F480}";
    statusDiv.textContent = statusText;
    this.root.appendChild(statusDiv);
    const mainContainer = document.createElement("div");
    mainContainer.style.display = "flex";
    mainContainer.style.flexDirection = "column";
    mainContainer.style.gap = "20px";
    const diceSection = document.createElement("div");
    diceSection.className = "dice-section";
    const diceContainer = document.createElement("div");
    diceContainer.className = "dice-container";
    if (view.dice.length > 0) {
      view.dice.forEach((value, index) => {
        const die = document.createElement("div");
        die.className = "die";
        die.textContent = value.toString();
        if (this.selectedDiceIndices.has(index)) {
          die.classList.add("selected");
        }
        if (this.selectedSkillId) {
          die.classList.add("target-mode");
        }
        die.onclick = () => this.handleDieClick(index, view);
        diceContainer.appendChild(die);
      });
    } else {
      const msg = document.createElement("div");
      msg.textContent = "Roll the dice to start!";
      diceContainer.appendChild(msg);
    }
    diceSection.appendChild(diceContainer);
    const controls = document.createElement("div");
    controls.className = "controls";
    const rollButton = document.createElement("button");
    const rollsLeft = view.rolls.max - view.rolls.current;
    if (view.dice.length === 0) {
      rollButton.textContent = "Roll Dice";
      rollButton.disabled = !view.rolls.canRoll;
      rollButton.onclick = () => this.onRoll();
    } else {
      if (this.selectedDiceIndices.size > 0) {
        rollButton.textContent = `Reroll Selected (${this.selectedDiceIndices.size})`;
        rollButton.onclick = () => this.onReroll(Array.from(this.selectedDiceIndices));
      } else {
        rollButton.textContent = "Select Dice to Reroll";
        rollButton.disabled = true;
      }
      if (!view.rolls.canRoll) {
        rollButton.textContent = "No Rolls Left";
        rollButton.disabled = true;
      }
    }
    controls.appendChild(rollButton);
    const rollInfo = document.createElement("div");
    rollInfo.className = "roll-info";
    rollInfo.textContent = `Rolls left: ${rollsLeft} / ${view.rolls.max}`;
    controls.appendChild(rollInfo);
    const instruction = document.createElement("div");
    instruction.className = "instructions";
    if (this.selectedSkillId) {
      instruction.textContent = `Select a die to apply ${view.skills[this.selectedSkillId].name}`;
      instruction.style.color = "var(--secondary-variant)";
      instruction.style.fontWeight = "bold";
    } else if (view.gameStatus === "playing") {
      if (view.dice.length === 0) {
        instruction.textContent = "Start your turn by rolling the dice.";
      } else if (view.rolls.canRoll) {
        instruction.textContent = "Select dice to reroll or choose a category/skill.";
      } else {
        instruction.textContent = "Choose a category to score.";
      }
    }
    controls.appendChild(instruction);
    diceSection.appendChild(controls);
    mainContainer.appendChild(diceSection);
    const skillsSection = document.createElement("div");
    skillsSection.className = "skills-section";
    Object.values(view.skills).forEach((skill) => {
      const card = document.createElement("div");
      card.className = `skill-card group-${this.getSkillGroupClass(skill.id)} ${skill.status}`;
      if (this.selectedSkillId === skill.id) {
        card.classList.add("selected");
      }
      const name = document.createElement("div");
      name.className = "skill-name";
      name.textContent = skill.name;
      const desc = document.createElement("div");
      desc.className = "skill-desc";
      desc.textContent = skill.effectDescription;
      card.appendChild(name);
      card.appendChild(desc);
      if (skill.status === "available") {
        card.onclick = () => this.handleSkillClick(skill.id, view);
      }
      skillsSection.appendChild(card);
    });
    mainContainer.appendChild(skillsSection);
    const categoriesSection = document.createElement("div");
    categoriesSection.className = "categories-container";
    const groups = ["dungeon", "str", "dex", "int"];
    groups.forEach((group) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "category-group";
      const title = document.createElement("h3");
      title.textContent = group === "dungeon" ? "Dungeon Floor" : `${group.toUpperCase()} Check`;
      groupDiv.appendChild(title);
      view.categories.filter((c) => c.group === group).forEach((cat) => {
        const item = document.createElement("div");
        item.className = "category-item";
        if (cat.isChecked) item.classList.add("checked");
        if (cat.isSelectable) {
          item.classList.add("selectable");
          item.onclick = () => this.onSelectCategory(cat.id);
        }
        const nameSpan = document.createElement("span");
        nameSpan.className = "category-name";
        nameSpan.textContent = this.formatCategoryName(cat.id);
        const statusSpan = document.createElement("span");
        statusSpan.className = "category-status";
        statusSpan.innerHTML = cat.isChecked ? "&#10003;" : cat.isSelectable ? "&#9675;" : "";
        item.appendChild(nameSpan);
        item.appendChild(statusSpan);
        groupDiv.appendChild(item);
      });
      categoriesSection.appendChild(groupDiv);
    });
    mainContainer.appendChild(categoriesSection);
    this.root.appendChild(mainContainer);
  }
  // Internal interaction handlers (re-render without full update to show selection state)
  handleDieClick(index, view) {
    if (view.gameStatus !== "playing") return;
    if (this.selectedSkillId) {
      this.onUseSkill(this.selectedSkillId, index);
    } else {
      if (this.selectedDiceIndices.has(index)) {
        this.selectedDiceIndices.delete(index);
      } else {
        this.selectedDiceIndices.add(index);
      }
      this.render(view);
    }
  }
  handleSkillClick(skillId, view) {
    if (this.selectedSkillId === skillId) {
      this.selectedSkillId = null;
    } else {
      this.selectedSkillId = skillId;
      this.selectedDiceIndices.clear();
    }
    this.render(view);
  }
  // Helpers
  getSkillGroupClass(id) {
    if (id.includes("str")) return "str";
    if (id.includes("dex")) return "dex";
    if (id.includes("int")) return "int";
    return "str";
  }
  formatCategoryName(id) {
    return id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).replace("Str ", "").replace("Dex ", "").replace("Int ", "").replace("Dungeon Floor ", "Floor ");
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

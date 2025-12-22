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
  constructor(root2, onRoll2, onReroll2, onUseSkill2, onSelectCategory2, onGameOver2) {
    // selectedDiceIndices now represents "Held" dice
    this.selectedDiceIndices = /* @__PURE__ */ new Set();
    this.selectedSkillId = null;
    this.recentlyCheckedCategories = /* @__PURE__ */ new Set();
    this.root = root2;
    this.onRoll = onRoll2;
    this.onReroll = onReroll2;
    this.onUseSkill = onUseSkill2;
    this.onSelectCategory = onSelectCategory2;
    this.onGameOver = onGameOver2;
  }
  update(view) {
    if (view.dice.length === 0 || view.gameStatus !== "playing") {
      this.selectedDiceIndices.clear();
    }
    this.selectedSkillId = null;
    this.render(view);
  }
  render(view) {
    this.root.innerHTML = "";
    const header = document.createElement("header");
    header.innerHTML = `<h1>Flyer Dungeon</h1>`;
    this.root.appendChild(header);
    if (view.gameStatus !== "playing") {
      const statusDiv = document.createElement("div");
      statusDiv.className = `game-status status-${view.gameStatus}`;
      let statusText = "";
      if (view.gameStatus === "won") statusText = "You Won! \u{1F389}";
      if (view.gameStatus === "lost") {
        statusText = "Game Over \u{1F480}";
        this.onGameOver();
      }
      statusDiv.textContent = statusText;
      this.root.appendChild(statusDiv);
    }
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
        const dieWrapper = document.createElement("div");
        dieWrapper.className = "die-wrapper";
        const die = document.createElement("div");
        die.className = "die";
        die.textContent = value.toString();
        if (this.selectedDiceIndices.has(index)) {
          die.classList.add("selected");
          const label = document.createElement("div");
          label.className = "held-label";
          label.textContent = "HELD";
          die.appendChild(label);
        }
        if (this.selectedSkillId) {
          die.classList.add("target-mode");
        }
        die.onclick = () => this.handleDieClick(index, view);
        dieWrapper.appendChild(die);
        diceContainer.appendChild(dieWrapper);
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
      rollButton.textContent = "Roll";
      if (!view.rolls.canRoll) {
        rollButton.textContent = "No Rolls Left";
        rollButton.disabled = true;
      } else {
        const unheldIndices = view.dice.map((_, i) => i).filter((i) => !this.selectedDiceIndices.has(i));
        rollButton.onclick = () => this.onReroll(unheldIndices);
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
        instruction.textContent = "Click dice to Hold, then Roll again. Or choose a category/skill.";
      } else {
        instruction.textContent = "Choose a category to score.";
      }
    }
    controls.appendChild(instruction);
    diceSection.appendChild(controls);
    mainContainer.appendChild(diceSection);
    const skillsSection = document.createElement("div");
    skillsSection.className = "skills-section";
    const counts = { dungeon: 0, str: 0, dex: 0, int: 0 };
    view.categories.forEach((c) => {
      if (c.isChecked) {
        counts[c.group]++;
      }
    });
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
      if (skill.status === "locked") {
        const group = this.getSkillGroupClass(skill.id);
        if (group !== "dungeon") {
          const current = counts[group] || 0;
          const progressDiv = document.createElement("div");
          progressDiv.className = "skill-progress";
          progressDiv.textContent = `Unlock: ${current}/3`;
          card.appendChild(progressDiv);
        }
      }
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
        if (cat.isChecked) {
          item.classList.add("checked");
          if (!this.recentlyCheckedCategories.has(cat.id)) {
            item.classList.add("check-success");
            this.recentlyCheckedCategories.add(cat.id);
          }
        } else {
          if (this.recentlyCheckedCategories.has(cat.id)) {
            this.recentlyCheckedCategories.delete(cat.id);
          }
        }
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
  // Internal interaction handlers
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
    const mapping = {
      "dungeon_floor_1": "Floor 1 (Sum 20+)",
      "dungeon_floor_2": "Floor 2 (Sum 24+)",
      "dungeon_floor_3": "Floor 3 (Sum 26+)",
      "dungeon_floor_4": "Floor 4 (Sum \u2264 9)",
      "dungeon_floor_5": "Floor 5 (Yahtzee)"
    };
    if (mapping[id]) return mapping[id];
    return id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()).replace("Str ", "").replace("Dex ", "").replace("Int ", "").replace("Dungeon Floor ", "Floor ");
  }
};

// src/playSound.ts
var SoundManager = class {
  constructor() {
    this.audioContext = null;
    this.isMuted = false;
  }
  /**
   * Lazily initializes the AudioContext.
   */
  getContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }
  /**
   * Plays a sound effect by name.
   */
  play(sound) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      switch (sound) {
        case "roll":
          this.playRoll(ctx);
          break;
        case "mighty":
          this.playMighty(ctx);
          break;
        case "acrobatics":
          this.playAcrobatics(ctx);
          break;
        case "metamorph":
          this.playMetamorph(ctx);
          break;
        case "win":
          this.playWin(ctx);
          break;
        case "lose":
          this.playLose(ctx);
          break;
        case "dungeon_progress":
          this.playDungeonProgress(ctx);
          break;
        case "attribute_gain":
          this.playAttributeGain(ctx);
          break;
      }
    } catch (e) {
      console.error("Failed to play sound:", e);
    }
  }
  /**
   * Generates a sound like a die rolling on a ceramic surface.
   * Uses high-frequency bandpass noise with multiple impacts.
   */
  playRoll(ctx) {
    const playClick = (timeOffset, volume) => {
      const duration = 0.05;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2500 + Math.random() * 500;
      filter.Q.value = 5;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume, ctx.currentTime + timeOffset);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOffset + duration);
      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      noise.start(ctx.currentTime + timeOffset);
    };
    playClick(0, 0.5);
    playClick(0.06, 0.4);
    playClick(0.13, 0.2);
  }
  /**
   * Generates a heroic, brass-like sound (Sawtooth wave).
   * Positive and strong feel.
   */
  playMighty(ctx) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(130.81, ctx.currentTime);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3e3, ctx.currentTime + 0.1);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.6);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }
  /**
   * Generates a quick, high-pitched sweep (sawtooth).
   */
  playAcrobatics(ctx) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }
  /**
   * Generates a modulating or wobbling sound (magic feel).
   */
  playMetamorph(ctx) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    lfo.start();
    osc.stop(ctx.currentTime + 0.6);
    lfo.stop(ctx.currentTime + 0.6);
  }
  /**
   * Generates a short victory jingle (major chord arpeggio).
   */
  playWin(ctx) {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const duration = 0.15;
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const startTime = now + index * 0.1;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
  /**
   * Generates a dramatic "Game Over" sound.
   * Uses a dissonant tritone interval sliding down with a heavy low-pass filter
   * to create a sense of doom and failure.
   */
  playLose(ctx) {
    const now = ctx.currentTime;
    const duration = 2;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(130.81, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + duration);
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(185, now);
    osc2.frequency.exponentialRampToValueAtTime(55, now + duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + duration);
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }
  /**
   * Generates a positive, ascending sound indicating forward movement.
   * Replaces the heavy thud with a pleasant "step forward" chime.
   */
  playDungeonProgress(ctx) {
    const now = ctx.currentTime;
    const notes = [440, 554.37];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gainNode.gain.setValueAtTime(0, now + i * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(1e-3, now + i * 0.1 + 0.4);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    });
  }
  /**
   * Generates a short, high-pitched "ding" or ascending tone.
   */
  playAttributeGain(ctx) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }
};
var soundManager = new SoundManager();
function playSound(sound) {
  soundManager.play(sound);
}

// src/main.ts
var root = document.getElementById("fd-stage");
var state = init();
var renderer = new Renderer(root, onRoll, onReroll, onUseSkill, onSelectCategory, onGameOver);
renderer.update(getView(state));
function handleInput(action) {
  state = step(state, action);
  const view = getView(state);
  renderer.update(view);
}
function onRoll() {
  onReroll([0, 1, 2, 3, 4]);
}
function onReroll(indexesToReroll) {
  playSound("roll");
  handleInput({
    type: "roll_dice",
    indexesToReroll
  });
}
function onUseSkill(skillId, targetDieIndex) {
  if (skillId === "skill_str_mighty") playSound("mighty");
  if (skillId === "skill_dex_acrobatics") playSound("acrobatics");
  if (skillId === "skill_int_metamorph") playSound("metamorph");
  handleInput({
    type: "use_skill",
    skillId,
    targetDieIndex
  });
}
function onSelectCategory(categoryId) {
  if (categoryId === "dungeon_floor_5") playSound("win");
  else if (categoryId.startsWith("dungeon_")) playSound("dungeon_progress");
  else playSound("attribute_gain");
  handleInput({
    type: "select_category",
    categoryId
  });
}
function onGameOver() {
  playSound("lose");
}

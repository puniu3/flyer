// src/rules.ts
var MAX_ROLLS = 3;
var SKILL_UNLOCK_THRESHOLD = 3;
var ALL_CATEGORY_IDS = [
  "dungeon_floor_1",
  "dungeon_floor_2",
  "dungeon_floor_3",
  "dungeon_floor_4",
  "dungeon_floor_5",
  "str_full_house",
  "str_four_of_a_kind",
  "str_three_of_a_kind_5",
  "str_three_of_a_kind_6",
  "dex_free",
  "dex_straight",
  "dex_three_of_a_kind_1",
  "dex_three_of_a_kind_2",
  "int_one_pair",
  "int_two_pair",
  "int_three_of_a_kind_3",
  "int_three_of_a_kind_4"
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
    case "str_full_house": {
      const has3 = countsValues.includes(3);
      const has2 = countsValues.includes(2);
      return has3 && has2;
    }
    case "str_four_of_a_kind":
      return countsValues.some((c) => c >= 4);
    case "str_three_of_a_kind_5":
      return counts[5] >= 3;
    case "str_three_of_a_kind_6":
      return counts[6] >= 3;
    case "dex_free":
      return sum >= 0;
    case "dex_straight":
      return getMaxStraightLength(dice) >= 5;
    case "dex_three_of_a_kind_1":
      return counts[1] >= 3;
    case "dex_three_of_a_kind_2":
      return counts[2] >= 3;
    case "int_one_pair":
      return countsValues.some((c) => c >= 2);
    case "int_two_pair": {
      const pairsCount = countsValues.filter((c) => c >= 2).length;
      return pairsCount >= 2;
    }
    case "int_three_of_a_kind_3":
      return counts[3] >= 3;
    case "int_three_of_a_kind_4":
      return counts[4] >= 3;
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
function applySkillEffect(skillId, dieValue) {
  if (skillId === "skill_str_mighty") {
    return 6;
  } else if (skillId === "skill_dex_acrobatics") {
    return Math.max(1, dieValue - 1);
  } else {
    return 7 - dieValue;
  }
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
      const newVal = applySkillEffect(skillId, currentVal);
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
  const newVal = applySkillEffect(skillId, currentVal);
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

// src/guide.ts
var GuideModal = class {
  constructor(t2) {
    this.t = t2;
    this.dialog = document.createElement("dialog");
    this.dialog.className = "guide-modal";
    this.dialog.innerHTML = this.buildContent();
    this.dialog.addEventListener("click", (e) => {
      const rect = this.dialog.getBoundingClientRect();
      const isInDialog = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (e.target === this.dialog) {
        this.close();
      }
    });
    this.dialog.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("guide-close-btn")) {
        this.close();
      }
    });
  }
  get element() {
    return this.dialog;
  }
  open() {
    this.dialog.showModal();
  }
  close() {
    this.dialog.close();
  }
  buildContent() {
    const t2 = this.t;
    return `
      <div class="guide-content">
        <header class="guide-header">
          <h2>${t2("guide_title")}</h2>
          <button class="guide-close-btn" aria-label="Close">&times;</button>
        </header>
        <div class="guide-body">
          <section class="guide-section">
            <h3>1. ${t2("guide_roll_title")}</h3>
            <ul>
              <li>${t2("guide_roll_1")}</li>
              <li>${t2("guide_roll_2")}</li>
              <li>${t2("guide_roll_3")}</li>
            </ul>
          </section>

          <section class="guide-section">
            <h3>2. ${t2("guide_skill_title")}</h3>
            <ul>
              <li>${t2("guide_skill_1")}</li>
              <li>${t2("guide_skill_2")}</li>
            </ul>
          </section>

          <section class="guide-section">
            <h3>3. ${t2("guide_write_title")}</h3>
            <ul>
              <li>${t2("guide_write_1")}</li>
              <li>${t2("guide_write_2")}</li>
              <li>${t2("guide_write_3")}</li>
            </ul>
          </section>
        </div>
        <footer class="guide-credit"><span>( ・3・)${t2("guide_credit")}</span><span class="ui-links" lang="en"><a href="${new URL("../?ui=3d", import.meta.url)}">3D</a> / <a href="${new URL("../?ui=text", import.meta.url)}">Text</a></span></footer>
      </div>
    `;
  }
};

// src/renderer.ts
var Renderer = class {
  constructor(root2, onRoll2, onReroll2, onUseSkill2, onSelectCategory2, onGameOver2, onHold2, onRestart2, t2) {
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
    this.onHold = onHold2;
    this.onRestart = onRestart2;
    this.t = t2;
    this.guideModal = new GuideModal(t2);
    document.body.appendChild(this.guideModal.element);
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
    header.innerHTML = `<h1>${this.t("game_title")}</h1>`;
    const helpBtn = document.createElement("button");
    helpBtn.className = "guide-btn";
    helpBtn.textContent = this.t("guide_btn");
    helpBtn.setAttribute("aria-label", this.t("guide_title"));
    helpBtn.onclick = () => this.guideModal.open();
    header.appendChild(helpBtn);
    this.root.appendChild(header);
    if (view.gameStatus !== "playing") {
      const statusDiv = document.createElement("div");
      statusDiv.className = `game-status status-${view.gameStatus}`;
      let statusText = "";
      if (view.gameStatus === "won") statusText = this.t("status_won");
      if (view.gameStatus === "lost") {
        statusText = this.t("status_lost");
        this.onGameOver();
      }
      statusDiv.textContent = statusText;
      this.root.appendChild(statusDiv);
      statusDiv.animate([
        { opacity: 0, transform: "scale(0.5) translateY(-50px)" },
        { opacity: 1, transform: "scale(1.05) translateY(10px)", offset: 0.6 },
        { opacity: 1, transform: "scale(1) translateY(0)" }
      ], {
        duration: 600,
        easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        fill: "forwards"
      });
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
          label.textContent = this.t("label_held");
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
      msg.textContent = this.t("msg_start");
      diceContainer.appendChild(msg);
    }
    diceSection.appendChild(diceContainer);
    const controls = document.createElement("div");
    controls.className = "controls";
    const rollButton = document.createElement("button");
    const rollsLeft = view.rolls.max - view.rolls.current;
    if (view.gameStatus !== "playing") {
      rollButton.textContent = this.t("btn_play_again");
      rollButton.classList.add("btn-restart");
      rollButton.onclick = () => this.onRestart();
      rollButton.disabled = false;
    } else if (view.dice.length === 0) {
      rollButton.textContent = this.t("btn_roll_initial");
      rollButton.disabled = !view.rolls.canRoll;
      rollButton.onclick = () => this.onRoll();
    } else {
      if (!view.rolls.canRoll) {
        rollButton.textContent = this.t("btn_no_rolls");
        rollButton.disabled = true;
      } else {
        rollButton.textContent = this.t("btn_roll", { current: rollsLeft, max: view.rolls.max });
        const unheldIndices = view.dice.map((_, i) => i).filter((i) => !this.selectedDiceIndices.has(i));
        rollButton.onclick = () => this.onReroll(unheldIndices);
      }
    }
    controls.appendChild(rollButton);
    const instruction = document.createElement("div");
    instruction.className = "instructions";
    if (this.selectedSkillId) {
      const skillName = this.t(`skill_name_${this.selectedSkillId}`);
      instruction.textContent = this.t("instr_apply_skill", { skillName });
      instruction.style.color = "var(--secondary-variant)";
      instruction.style.fontWeight = "bold";
    } else if (view.gameStatus === "playing") {
      if (view.dice.length === 0) {
        instruction.textContent = this.t("instr_start_turn");
      } else if (view.rolls.canRoll) {
        instruction.textContent = this.t("instr_mid_turn");
      } else {
        instruction.textContent = this.t("instr_choose_category");
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
      name.textContent = this.t(`skill_name_${skill.id}`);
      const desc = document.createElement("div");
      desc.className = "skill-desc";
      desc.textContent = this.t(`skill_desc_${skill.id}`);
      card.appendChild(name);
      card.appendChild(desc);
      if (skill.status === "locked") {
        const group = this.getSkillGroupClass(skill.id);
        if (group !== "dungeon") {
          const current = counts[group] || 0;
          const progressDiv = document.createElement("div");
          progressDiv.className = "skill-progress";
          progressDiv.textContent = this.t("label_unlock_progress", { current });
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
      if (group === "dungeon") {
        groupDiv.classList.add("dungeon-group");
      }
      const title = document.createElement("h3");
      const titleText = this.t(group === "dungeon" ? "header_dungeon" : `header_${group}`);
      if (group !== "dungeon") {
        const groupCount = counts[group];
        const isUnlocked = groupCount >= 3;
        groupDiv.classList.add(`group-${group}`);
        const titleSpan = document.createElement("span");
        titleSpan.textContent = titleText;
        title.appendChild(titleSpan);
        const progressIndicator = document.createElement("span");
        progressIndicator.className = "skill-unlock-indicator";
        if (isUnlocked) {
          progressIndicator.classList.add("unlocked");
        } else if (groupCount === 2) {
          progressIndicator.classList.add("approaching");
        }
        for (let i = 0; i < 3; i++) {
          const dot = document.createElement("span");
          dot.className = "unlock-dot";
          if (i < groupCount) {
            dot.classList.add("filled");
          }
          progressIndicator.appendChild(dot);
        }
        title.appendChild(progressIndicator);
      } else {
        title.textContent = titleText;
      }
      groupDiv.appendChild(title);
      const dungeonCategories = group === "dungeon" ? view.categories.filter((c) => c.group === "dungeon") : [];
      const nextFloorIndex = dungeonCategories.findIndex((c) => !c.isChecked);
      view.categories.filter((c) => c.group === group).forEach((cat, index) => {
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
        if (group === "dungeon" && !cat.isChecked) {
          if (index === nextFloorIndex) {
            item.classList.add("floor-next");
          } else if (index > nextFloorIndex) {
            item.classList.add("floor-locked");
          }
        }
        if (cat.isSelectable) {
          item.classList.add("selectable");
          item.onclick = () => this.onSelectCategory(cat.id);
        }
        const nameSpan = document.createElement("span");
        nameSpan.className = "category-name";
        const rawName = this.formatCategoryName(cat.id);
        const match = rawName.match(/^(.+?)(\s*[(\uff08].+[)\uff09])$/);
        if (match) {
          const mainSpan = document.createElement("span");
          mainSpan.textContent = match[1];
          const subSpan = document.createElement("span");
          subSpan.className = "category-note";
          subSpan.textContent = match[2].trim();
          nameSpan.appendChild(mainSpan);
          nameSpan.appendChild(subSpan);
        } else {
          nameSpan.textContent = rawName;
        }
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
      this.onHold();
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
    return this.t(`cat_${id}`);
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
   * Browsers require a user interaction before an AudioContext can run.
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
        case "hold":
          this.playHold(ctx);
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
   * Generates a majestic fanfare for a major victory.
   * Simulates a brass section with a triumphant melody and sustained chord.
   * Sequence: Rapid ascending arpeggio -> Sustained Grand Chord.
   */
  playWin(ctx) {
    const now = ctx.currentTime;
    const playBrass = (freq, t2, dur, vol) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(500, t2);
      filter.frequency.linearRampToValueAtTime(3e3, t2 + 0.1);
      filter.frequency.linearRampToValueAtTime(1500, t2 + dur);
      gainNode.gain.setValueAtTime(0, t2);
      gainNode.gain.linearRampToValueAtTime(vol, t2 + 0.05);
      gainNode.gain.linearRampToValueAtTime(vol * 0.8, t2 + 0.2);
      gainNode.gain.setValueAtTime(vol * 0.8, t2 + dur - 0.5);
      gainNode.gain.exponentialRampToValueAtTime(1e-3, t2 + dur);
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(t2);
      osc.stop(t2 + dur + 0.1);
    };
    playBrass(261.63, now + 0, 0.3, 0.2);
    playBrass(329.63, now + 0.15, 0.3, 0.2);
    playBrass(392, now + 0.3, 0.3, 0.2);
    playBrass(392, now + 0.45, 0.2, 0.2);
    const chordStart = now + 0.65;
    const chordDuration = 3.5;
    playBrass(523.25, chordStart, chordDuration, 0.25);
    playBrass(659.25, chordStart, chordDuration, 0.15);
    playBrass(392, chordStart, chordDuration, 0.15);
    playBrass(130.81, chordStart, chordDuration, 0.3);
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
  /**
   * Generates a short, subtle blip for UI selection (holding/locking a die).
   * Soft sine wave, high pitch, very short duration.
   */
  playHold(ctx) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.05);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }
};
var soundManager = new SoundManager();
function playSound(sound) {
  soundManager.play(sound);
}

// src/i18n.ts
var en = {
  // UI
  "game_title": "Flyer Dungeon",
  "status_won": "You Won! 🎉",
  "status_lost": "Game Over 💀",
  "msg_start": "Roll the dice to start!",
  "label_held": "HELD",
  "btn_play_again": "PLAY AGAIN ↺",
  "btn_roll_initial": "ROLL DICE",
  "btn_no_rolls": "NO ROLLS LEFT",
  "btn_roll": "ROLL ({current}/{max})",
  "instr_apply_skill": "Select a die to apply {skillName}",
  "instr_start_turn": "Start your turn by rolling the dice.",
  "instr_mid_turn": "Click dice to Hold, then Roll again. Or choose a category/skill.",
  "instr_choose_category": "Choose a category to score.",
  "label_unlock_progress": "Unlock: {current}/3",
  "header_dungeon": "Dungeon Floor",
  "header_str": "STR",
  "header_dex": "DEX",
  "header_int": "INT",
  // Categories
  "cat_dungeon_floor_1": "Floor 1 (Sum 20+)",
  "cat_dungeon_floor_2": "Floor 2 (Sum 24+)",
  "cat_dungeon_floor_3": "Floor 3 (Sum 26+)",
  "cat_dungeon_floor_4": "Floor 4 (Sum ≤ 9)",
  "cat_dungeon_floor_5": "Floor 5 (Five of a Kind)",
  "cat_str_full_house": "Full House",
  "cat_str_four_of_a_kind": "Four of a Kind",
  "cat_str_three_of_a_kind_5": "Three of a Kind (5s)",
  "cat_str_three_of_a_kind_6": "Three of a Kind (6s)",
  "cat_dex_free": "Free",
  "cat_dex_straight": "Straight",
  "cat_dex_three_of_a_kind_1": "Three of a Kind (1s)",
  "cat_dex_three_of_a_kind_2": "Three of a Kind (2s)",
  "cat_int_one_pair": "One Pair",
  "cat_int_two_pair": "Two Pair",
  "cat_int_three_of_a_kind_3": "Three of a Kind (3s)",
  "cat_int_three_of_a_kind_4": "Three of a Kind (4s)",
  // Skills
  "skill_name_skill_str_mighty": "Mighty",
  "skill_desc_skill_str_mighty": "Set a die to 6",
  "skill_name_skill_dex_acrobatics": "Acrobatics",
  "skill_desc_skill_dex_acrobatics": "Reduce die value by 1 (min 1)",
  "skill_name_skill_int_metamorph": "Polymorph",
  // Changed from Metamorph
  "skill_desc_skill_int_metamorph": "Flip a die (1<->6, 2<->5, 3<->4)",
  // Guide Modal
  "guide_btn": "?",
  "guide_title": "How to Play",
  "guide_roll_title": "ROLL",
  "guide_roll_1": "Roll 5 dice.",
  "guide_roll_2": "You can roll up to 3 times total (2 re-rolls).",
  "guide_roll_3": "Hold dice you want to keep, then roll again.",
  "guide_skill_title": "USE SKILL",
  "guide_skill_1": "Unlock skills by checking 3 categories in a stat.",
  "guide_skill_2": "Each skill can be used once per turn.",
  "guide_write_title": "SELECT",
  "guide_write_1": "Check one category that matches your dice.",
  "guide_write_2": "If nothing matches → Game Over!",
  "guide_write_3": "Check Floor 5 → You Win!",
  "guide_credit": "←Dev"
  // Changed from Creator (more casual)
};
var ja = {
  // UI
  "game_title": "チラシの裏ダンジョン",
  "status_won": "勝利！ 🎉",
  "status_lost": "ゲームオーバー 💀",
  "msg_start": "ダイスを振ってスタート！",
  "label_held": "キープ",
  "btn_play_again": "もう一度遊ぶ ↺",
  "btn_roll_initial": "ダイスを振る",
  "btn_no_rolls": "残り回数なし",
  "btn_roll": "振り直し ({current}/{max})",
  "instr_apply_skill": "{skillName}を適用するダイスを選択",
  "instr_start_turn": "ダイスを振ってターン開始",
  "instr_mid_turn": "ダイスを選んで振り直すか、役・スキルを選んでください",
  "instr_choose_category": "役を選択してください",
  "label_unlock_progress": "解放: {current}/3",
  "header_dungeon": "ダンジョン",
  "header_str": "STR",
  "header_dex": "DEX",
  "header_int": "INT",
  // Categories
  "cat_dungeon_floor_1": "第1階層 (合計20以上)",
  "cat_dungeon_floor_2": "第2階層 (合計24以上)",
  "cat_dungeon_floor_3": "第3階層 (合計26以上)",
  "cat_dungeon_floor_4": "第4階層 (合計9以下)",
  "cat_dungeon_floor_5": "第5階層 (ファイブカード)",
  "cat_str_full_house": "フルハウス",
  "cat_str_four_of_a_kind": "フォーカード",
  "cat_str_three_of_a_kind_5": "5のスリーカード",
  "cat_str_three_of_a_kind_6": "6のスリーカード",
  "cat_dex_free": "フリー",
  "cat_dex_straight": "ストレート",
  "cat_dex_three_of_a_kind_1": "1のスリーカード",
  "cat_dex_three_of_a_kind_2": "2のスリーカード",
  "cat_int_one_pair": "ワンペア",
  "cat_int_two_pair": "ツーペア",
  "cat_int_three_of_a_kind_3": "3のスリーカード",
  "cat_int_three_of_a_kind_4": "4のスリーカード",
  // Skills
  "skill_name_skill_str_mighty": "剛腕",
  "skill_desc_skill_str_mighty": "ダイス1つを6にする",
  "skill_name_skill_dex_acrobatics": "軽業",
  "skill_desc_skill_dex_acrobatics": "ダイスの値を1減らす(最小1)",
  "skill_name_skill_int_metamorph": "変身",
  "skill_desc_skill_int_metamorph": "ダイスの裏表を反転(1<->6...)",
  // Guide Modal
  "guide_btn": "?",
  "guide_title": "遊び方",
  "guide_roll_title": "振る",
  "guide_roll_1": "ダイスを5個振る",
  "guide_roll_2": "好きな目だけ残して振り直し",
  "guide_roll_3": "合計3投まで",
  "guide_skill_title": "スキルを使う",
  "guide_skill_1": "習得済み(✔×3)のスキルを使用可",
  "guide_skill_2": "各スキル、1ターンに各1回使用OK",
  "guide_write_title": "埋める",
  "guide_write_1": "条件を満たすマスを1つチェック",
  "guide_write_2": "どこも埋められない ⇒ 即ゲームオーバー！",
  "guide_write_3": "第5階層をチェック ⇒ ゲームクリア！",
  "guide_credit": "←作った人"
};
var zh = {
  // UI
  "game_title": "传单背面地下城",
  "status_won": "胜利！ 🎉",
  "status_lost": "游戏结束 💀",
  "msg_start": "掷骰子开始！",
  "label_held": "保留",
  "btn_play_again": "再玩一次 ↺",
  "btn_roll_initial": "掷骰子",
  "btn_no_rolls": "无剩余次数",
  "btn_roll": "重掷 ({current}/{max})",
  "instr_apply_skill": "选择要对其使用{skillName}的骰子",
  "instr_start_turn": "掷骰子开始回合",
  "instr_mid_turn": "选择骰子重掷，或选择组合/技能",
  "instr_choose_category": "请选择一个组合",
  "label_unlock_progress": "解锁: {current}/3",
  "header_dungeon": "地下城",
  "header_str": "STR",
  "header_dex": "DEX",
  "header_int": "INT",
  // Categories
  "cat_dungeon_floor_1": "地下1层 (总点数20以上)",
  "cat_dungeon_floor_2": "地下2层 (总点数24以上)",
  "cat_dungeon_floor_3": "地下3层 (总点数26以上)",
  "cat_dungeon_floor_4": "地下4层 (总点数9以下)",
  "cat_dungeon_floor_5": "地下5层 (五条)",
  "cat_str_full_house": "葫芦",
  "cat_str_four_of_a_kind": "四条",
  "cat_str_three_of_a_kind_5": "5的三条",
  "cat_str_three_of_a_kind_6": "6的三条",
  "cat_dex_free": "自由",
  "cat_dex_straight": "顺子",
  "cat_dex_three_of_a_kind_1": "1的三条",
  "cat_dex_three_of_a_kind_2": "2的三条",
  "cat_int_one_pair": "一对",
  "cat_int_two_pair": "两对",
  "cat_int_three_of_a_kind_3": "3的三条",
  "cat_int_three_of_a_kind_4": "4的三条",
  // Skills
  "skill_name_skill_str_mighty": "蛮力",
  "skill_desc_skill_str_mighty": "将一颗骰子设为6",
  "skill_name_skill_dex_acrobatics": "轻功",
  "skill_desc_skill_dex_acrobatics": "骰子点数减1（最小1）",
  "skill_name_skill_int_metamorph": "变形",
  "skill_desc_skill_int_metamorph": "翻转骰子（1<->6, 2<->5, 3<->4）",
  // Guide Modal
  "guide_btn": "?",
  "guide_title": "游戏规则",
  "guide_roll_title": "掷骰",
  "guide_roll_1": "掷5颗骰子",
  "guide_roll_2": "保留想要的骰子，重掷其余的",
  "guide_roll_3": "最多掷3次",
  "guide_skill_title": "使用技能",
  "guide_skill_1": "达成3个✔后解锁对应技能",
  "guide_skill_2": "每技能每回合可使用1次",
  "guide_write_title": "选择",
  "guide_write_1": "勾选一个满足条件的格子",
  "guide_write_2": "无法勾选任何格子 ⇒ 游戏结束！",
  "guide_write_3": "勾选地下5层 ⇒ 通关！",
  "guide_credit": "←作者"
};
var zhTW = {
  // UI
  "game_title": "傳單背面地下城",
  "status_won": "勝利！ 🎉",
  "status_lost": "遊戲結束 💀",
  "msg_start": "擲骰子開始！",
  "label_held": "保留",
  "btn_play_again": "再玩一次 ↺",
  "btn_roll_initial": "擲骰子",
  "btn_no_rolls": "無剩餘次數",
  "btn_roll": "重擲 ({current}/{max})",
  "instr_apply_skill": "選擇要對其使用 {skillName} 的骰子",
  "instr_start_turn": "擲骰子開始回合",
  "instr_mid_turn": "選擇骰子重擲，或選擇組合/技能",
  "instr_choose_category": "請選擇一個組合",
  "label_unlock_progress": "解鎖: {current}/3",
  "header_dungeon": "地下城",
  "header_str": "STR",
  "header_dex": "DEX",
  "header_int": "INT",
  // Categories
  "cat_dungeon_floor_1": "地下 1 層 (總點數 20 以上)",
  "cat_dungeon_floor_2": "地下 2 層 (總點數 24 以上)",
  "cat_dungeon_floor_3": "地下 3 層 (總點數 26 以上)",
  "cat_dungeon_floor_4": "地下 4 層 (總點數 9 以下)",
  "cat_dungeon_floor_5": "地下 5 層 (五條)",
  "cat_str_full_house": "葫蘆",
  "cat_str_four_of_a_kind": "四條",
  "cat_str_three_of_a_kind_5": "5 的三條",
  "cat_str_three_of_a_kind_6": "6 的三條",
  "cat_dex_free": "自由",
  "cat_dex_straight": "順子",
  "cat_dex_three_of_a_kind_1": "1 的三條",
  "cat_dex_three_of_a_kind_2": "2 的三條",
  "cat_int_one_pair": "一對",
  "cat_int_two_pair": "兩對",
  "cat_int_three_of_a_kind_3": "3 的三條",
  "cat_int_three_of_a_kind_4": "4 的三條",
  // Skills
  "skill_name_skill_str_mighty": "蠻力",
  "skill_desc_skill_str_mighty": "將一顆骰子設為 6",
  "skill_name_skill_dex_acrobatics": "輕功",
  "skill_desc_skill_dex_acrobatics": "骰子點數減 1 (最小 1)",
  "skill_name_skill_int_metamorph": "變形",
  "skill_desc_skill_int_metamorph": "翻轉骰子 (1<->6, 2<->5, 3<->4)",
  // Guide Modal
  "guide_btn": "?",
  "guide_title": "遊戲規則",
  "guide_roll_title": "擲骰",
  "guide_roll_1": "擲 5 顆骰子",
  "guide_roll_2": "保留想要的骰子，重擲其餘的",
  "guide_roll_3": "最多擲 3 次",
  "guide_skill_title": "使用技能",
  "guide_skill_1": "達成 3 個 ✔ 後解鎖對應技能",
  "guide_skill_2": "每個技能每回合可使用 1 次",
  "guide_write_title": "選擇",
  "guide_write_1": "勾選一個滿足條件的格子",
  "guide_write_2": "無法勾選任何格子 ⇒ 遊戲結束！",
  "guide_write_3": "勾選地下 5 層 ⇒ 通關！",
  "guide_credit": "←作者"
};
var ko = {
  // UI
  "game_title": "전단지 뒷면 던전",
  "status_won": "승리! 🎉",
  "status_lost": "게임 오버 💀",
  "msg_start": "주사위를 굴려 시작하세요!",
  "label_held": "킵",
  "btn_play_again": "다시 하기 ↺",
  "btn_roll_initial": "주사위 굴리기",
  "btn_no_rolls": "기회 없음",
  "btn_roll": "다시 굴리기 ({current}/{max})",
  "instr_apply_skill": "{skillName} 스킬을 사용할 주사위를 선택하세요",
  "instr_start_turn": "주사위를 굴려 턴 시작",
  "instr_mid_turn": "주사위를 킵하고 굴리거나, 족보/스킬을 선택하세요",
  "instr_choose_category": "족보를 선택하세요",
  "label_unlock_progress": "해금: {current}/3",
  "header_dungeon": "던전",
  "header_str": "STR",
  "header_dex": "DEX",
  "header_int": "INT",
  // Categories
  "cat_dungeon_floor_1": "지하 1층 (합계 20 이상)",
  "cat_dungeon_floor_2": "지하 2층 (합계 24 이상)",
  "cat_dungeon_floor_3": "지하 3층 (합계 26 이상)",
  "cat_dungeon_floor_4": "지하 4층 (합계 9 이하)",
  "cat_dungeon_floor_5": "지하 5층 (파이브 카드)",
  "cat_str_full_house": "풀하우스",
  "cat_str_four_of_a_kind": "포 카드",
  "cat_str_three_of_a_kind_5": "5의 쓰리 카드",
  "cat_str_three_of_a_kind_6": "6의 쓰리 카드",
  "cat_dex_free": "프리",
  "cat_dex_straight": "스트레이트",
  "cat_dex_three_of_a_kind_1": "1의 쓰리 카드",
  "cat_dex_three_of_a_kind_2": "2의 쓰리 카드",
  "cat_int_one_pair": "원 페어",
  "cat_int_two_pair": "투 페어",
  "cat_int_three_of_a_kind_3": "3의 쓰리 카드",
  "cat_int_three_of_a_kind_4": "4의 쓰리 카드",
  // Skills
  "skill_name_skill_str_mighty": "괴력",
  "skill_desc_skill_str_mighty": "주사위 1개를 6으로 설정",
  "skill_name_skill_dex_acrobatics": "곡예",
  "skill_desc_skill_dex_acrobatics": "주사위 눈 1 감소 (최소 1)",
  "skill_name_skill_int_metamorph": "변신",
  "skill_desc_skill_int_metamorph": "주사위 뒤집기 (1↔6...)",
  // Guide Modal
  "guide_btn": "?",
  "guide_title": "게임 방법",
  "guide_roll_title": "굴리기",
  "guide_roll_1": "주사위 5개를 굴립니다.",
  "guide_roll_2": "원하는 주사위는 킵(Hold)하고 나머지를 다시 굴립니다.",
  "guide_roll_3": "한 턴에 총 3번까지 굴릴 수 있습니다.",
  "guide_skill_title": "스킬 사용",
  "guide_skill_1": "각 능력치에서 3개를 달성(✔)하면 스킬이 해금됩니다.",
  "guide_skill_2": "각 스킬은 턴마다 1번씩 사용할 수 있습니다.",
  "guide_write_title": "기록하기",
  "guide_write_1": "조건을 만족하는 칸을 하나 선택해 체크하세요.",
  "guide_write_2": "체크할 곳이 없다면 ⇒ 게임 오버!",
  "guide_write_3": "지하 5층을 체크하면 ⇒ 게임 클리어!",
  "guide_credit": "←만든 사람"
};
var de = {
  // UI
  "game_title": "Flyer Dungeon",
  "status_won": "Gewonnen! 🎉",
  "status_lost": "Game Over 💀",
  "msg_start": "Würfle zum Starten!",
  "label_held": "HALTEN",
  "btn_play_again": "NOCHMAL ↺",
  "btn_roll_initial": "WÜRFELN",
  "btn_no_rolls": "KEINE WÜRFE",
  "btn_roll": "WÜRFELN ({current}/{max})",
  "instr_apply_skill": "Wähle einen Würfel für {skillName}",
  "instr_start_turn": "Würfle, um den Zug zu starten.",
  "instr_mid_turn": "Würfel halten und neu werfen. Oder Kategorie/Skill wählen.",
  "instr_choose_category": "Wähle eine Kategorie.",
  "label_unlock_progress": "Freischalten: {current}/3",
  "header_dungeon": "Dungeon-Ebene",
  "header_str": "STR",
  "header_dex": "DEX",
  "header_int": "INT",
  // Categories
  "cat_dungeon_floor_1": "Ebene 1 (Summe 20+)",
  "cat_dungeon_floor_2": "Ebene 2 (Summe 24+)",
  "cat_dungeon_floor_3": "Ebene 3 (Summe 26+)",
  "cat_dungeon_floor_4": "Ebene 4 (Summe ≤ 9)",
  "cat_dungeon_floor_5": "Ebene 5 (Fünferpasch)",
  "cat_str_full_house": "Full House",
  "cat_str_four_of_a_kind": "Viererpasch",
  "cat_str_three_of_a_kind_5": "Dreierpasch (5er)",
  "cat_str_three_of_a_kind_6": "Dreierpasch (6er)",
  "cat_dex_free": "Freie Wahl",
  "cat_dex_straight": "Straße",
  "cat_dex_three_of_a_kind_1": "Dreierpasch (1er)",
  "cat_dex_three_of_a_kind_2": "Dreierpasch (2er)",
  "cat_int_one_pair": "Ein Paar",
  "cat_int_two_pair": "Zwei Paare",
  "cat_int_three_of_a_kind_3": "Dreierpasch (3er)",
  "cat_int_three_of_a_kind_4": "Dreierpasch (4er)",
  // Skills
  "skill_name_skill_str_mighty": "Kraft",
  "skill_desc_skill_str_mighty": "Einen Würfel auf 6 setzen",
  "skill_name_skill_dex_acrobatics": "Akrobatik",
  "skill_desc_skill_dex_acrobatics": "Würfelwert um 1 verringern (min 1)",
  "skill_name_skill_int_metamorph": "Verwandlung",
  "skill_desc_skill_int_metamorph": "Würfel umdrehen (1<->6, 2<->5...)",
  // Guide Modal
  "guide_btn": "?",
  "guide_title": "Spielregeln",
  "guide_roll_title": "WÜRFELN",
  "guide_roll_1": "Wirf 5 Würfel.",
  "guide_roll_2": "Halte gewünschte Würfel und wirf den Rest neu.",
  "guide_roll_3": "Maximal 3 Würfe pro Zug.",
  "guide_skill_title": "SKILLS",
  "guide_skill_1": "Erfülle 3 Kategorien in einem Attribut, um Skills freizuschalten.",
  "guide_skill_2": "Jeder Skill kann einmal pro Zug genutzt werden.",
  "guide_write_title": "WÄHLEN",
  "guide_write_1": "Wähle ein Feld, das die Bedingung erfüllt.",
  "guide_write_2": "Kein passendes Feld? → Game Over!",
  "guide_write_3": "Ebene 5 erreicht? → Gewonnen!",
  "guide_credit": "←Dev"
};
var fr = {
  // UI
  "game_title": "Flyer Dungeon",
  "status_won": "Gagné ! 🎉",
  "status_lost": "Game Over 💀",
  "msg_start": "Lancez les dés pour commencer !",
  "label_held": "GARDÉ",
  "btn_play_again": "REJOUER ↺",
  "btn_roll_initial": "LANCER",
  "btn_no_rolls": "PLUS DE LANCERS",
  "btn_roll": "RELANCER ({current}/{max})",
  "instr_apply_skill": "Sélectionnez un dé pour {skillName}",
  "instr_start_turn": "Lancez les dés pour commencer le tour.",
  "instr_mid_turn": "Gardez des dés et relancez. Ou choisissez une catégorie/compétence.",
  "instr_choose_category": "Choisissez une catégorie.",
  "label_unlock_progress": "Débloqué : {current}/3",
  "header_dungeon": "Donjon",
  "header_str": "FOR",
  "header_dex": "DEX",
  "header_int": "INT",
  // Categories
  "cat_dungeon_floor_1": "Niveau 1 (Somme 20+)",
  "cat_dungeon_floor_2": "Niveau 2 (Somme 24+)",
  "cat_dungeon_floor_3": "Niveau 3 (Somme 26+)",
  "cat_dungeon_floor_4": "Niveau 4 (Somme ≤ 9)",
  "cat_dungeon_floor_5": "Niveau 5 (Yams)",
  "cat_str_full_house": "Full House",
  "cat_str_four_of_a_kind": "Carré",
  "cat_str_three_of_a_kind_5": "Brelan de 5",
  "cat_str_three_of_a_kind_6": "Brelan de 6",
  "cat_dex_free": "Libre",
  "cat_dex_straight": "Suite",
  "cat_dex_three_of_a_kind_1": "Brelan de 1",
  "cat_dex_three_of_a_kind_2": "Brelan de 2",
  "cat_int_one_pair": "Une Paire",
  "cat_int_two_pair": "Deux Paires",
  "cat_int_three_of_a_kind_3": "Brelan de 3",
  "cat_int_three_of_a_kind_4": "Brelan de 4",
  // Skills
  "skill_name_skill_str_mighty": "Puissance",
  "skill_desc_skill_str_mighty": "Mettre un dé sur 6",
  "skill_name_skill_dex_acrobatics": "Acrobatie",
  "skill_desc_skill_dex_acrobatics": "Réduire un dé de 1 (min 1)",
  "skill_name_skill_int_metamorph": "Polymorphie",
  "skill_desc_skill_int_metamorph": "Inverser un dé (1<->6...)",
  // Guide Modal
  "guide_btn": "?",
  "guide_title": "Règles",
  "guide_roll_title": "LANCER",
  "guide_roll_1": "Lancez 5 dés.",
  "guide_roll_2": "Gardez les dés voulus, relancez le reste.",
  "guide_roll_3": "Max 3 lancers au total.",
  "guide_skill_title": "COMPÉTENCES",
  "guide_skill_1": "Validez 3 catégories d'une stat pour débloquer.",
  "guide_skill_2": "1 utilisation par compétence par tour.",
  "guide_write_title": "CHOISIR",
  "guide_write_1": "Cochez une case valide.",
  "guide_write_2": "Rien à cocher ? → Perdu !",
  "guide_write_3": "Niveau 5 coché ? → Gagné !",
  "guide_credit": "←Dev"
};
var es = {
  // UI
  "game_title": "Flyer Dungeon",
  "status_won": "¡Has Ganado! 🎉",
  "status_lost": "Fin del Juego 💀",
  "msg_start": "¡Lanza los dados para empezar!",
  "label_held": "GUARDADO",
  "btn_play_again": "JUGAR DE NUEVO ↺",
  "btn_roll_initial": "LANZAR",
  "btn_no_rolls": "SIN TIROS",
  "btn_roll": "RELANZAR ({current}/{max})",
  "instr_apply_skill": "Elige un dado para {skillName}",
  "instr_start_turn": "Lanza los dados para empezar tu turno.",
  "instr_mid_turn": "Guarda dados y relanza. O elige categoría/habilidad.",
  "instr_choose_category": "Elige una categoría.",
  "label_unlock_progress": "Desbloqueo: {current}/3",
  "header_dungeon": "Mazmorra",
  "header_str": "FUE",
  "header_dex": "DES",
  "header_int": "INT",
  // Categories
  "cat_dungeon_floor_1": "Nivel 1 (Suma 20+)",
  "cat_dungeon_floor_2": "Nivel 2 (Suma 24+)",
  "cat_dungeon_floor_3": "Nivel 3 (Suma 26+)",
  "cat_dungeon_floor_4": "Nivel 4 (Suma ≤ 9)",
  "cat_dungeon_floor_5": "Nivel 5 (Generala)",
  "cat_str_full_house": "Full",
  "cat_str_four_of_a_kind": "Póker",
  "cat_str_three_of_a_kind_5": "Trío de 5",
  "cat_str_three_of_a_kind_6": "Trío de 6",
  "cat_dex_free": "Libre",
  "cat_dex_straight": "Escalera",
  "cat_dex_three_of_a_kind_1": "Trío de 1",
  "cat_dex_three_of_a_kind_2": "Trío de 2",
  "cat_int_one_pair": "Un Par",
  "cat_int_two_pair": "Dos Pares",
  "cat_int_three_of_a_kind_3": "Trío de 3",
  "cat_int_three_of_a_kind_4": "Trío de 4",
  // Skills
  "skill_name_skill_str_mighty": "Poder",
  "skill_desc_skill_str_mighty": "Poner un dado en 6",
  "skill_name_skill_dex_acrobatics": "Acrobacia",
  "skill_desc_skill_dex_acrobatics": "Reducir dado en 1 (mín 1)",
  "skill_name_skill_int_metamorph": "Polimorfia",
  "skill_desc_skill_int_metamorph": "Invertir dado (1<->6...)",
  // Guide Modal
  "guide_btn": "?",
  "guide_title": "Cómo Jugar",
  "guide_roll_title": "LANZAR",
  "guide_roll_1": "Lanza 5 dados.",
  "guide_roll_2": "Guarda los que quieras, relanza el resto.",
  "guide_roll_3": "Máx 3 tiros en total.",
  "guide_skill_title": "HABILIDADES",
  "guide_skill_1": "Desbloquea al cumplir 3 categorías de un atributo.",
  "guide_skill_2": "1 uso por habilidad por turno.",
  "guide_write_title": "ELEGIR",
  "guide_write_1": "Marca una casilla válida.",
  "guide_write_2": "¿Nada válido? → ¡Fin del Juego!",
  "guide_write_3": "¿Nivel 5 marcado? → ¡Ganaste!",
  "guide_credit": "←Dev"
};
var dictionaries = { en, ja, zh, "zh-TW": zhTW, ko, de, fr, es };
function createTranslator(locale2) {
  let lang = "en";
  if (locale2 === "zh-TW" || locale2 === "zh-Hant" || locale2.startsWith("zh-TW")) {
    lang = "zh-TW";
  } else if (locale2.startsWith("ja")) {
    lang = "ja";
  } else if (locale2.startsWith("zh")) {
    lang = "zh";
  } else if (locale2.startsWith("ko")) {
    lang = "ko";
  } else if (locale2.startsWith("de")) {
    lang = "de";
  } else if (locale2.startsWith("fr")) {
    lang = "fr";
  } else if (locale2.startsWith("es")) {
    lang = "es";
  }
  const dict = dictionaries[lang] || dictionaries["en"];
  return (key, params) => {
    let text = dict[key] || en[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };
}

// src/main.ts
var root = document.getElementById("fd-stage");
var state = init();
var locale = navigator.language;
var t = createTranslator(locale);
var renderer = new Renderer(
  root,
  onRoll,
  onReroll,
  onUseSkill,
  onSelectCategory,
  onGameOver,
  onHold,
  onRestart,
  t
  // Inject translator
);
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
function onHold() {
  playSound("hold");
}
function onRestart() {
  playSound("roll");
  state = init();
  renderer.update(getView(state));
}

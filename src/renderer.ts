import { GameView, CategoryId, SkillId, DieValue, CategoryGroup, SkillStatus } from './types';

export class Renderer {
  private root: HTMLElement;
  private onRoll: () => void;
  private onReroll: (indexesToReroll: number[]) => void;
  private onUseSkill: (skillId: SkillId, targetDieIndex: number) => void;
  private onSelectCategory: (categoryId: CategoryId) => void;

  private selectedDiceIndices: Set<number> = new Set();
  private selectedSkillId: SkillId | null = null;

  constructor(
    root: HTMLElement,
    onRoll: () => void,
    onReroll: (indexesToReroll: number[]) => void,
    onUseSkill: (skillId: SkillId, targetDieIndex: number) => void,
    onSelectCategory: (categoryId: CategoryId) => void
  ) {
    this.root = root;
    this.onRoll = onRoll;
    this.onReroll = onReroll;
    this.onUseSkill = onUseSkill;
    this.onSelectCategory = onSelectCategory;
  }

  update(view: GameView): void {
    // Reset selections on update (assuming a new state usually means we start fresh interaction-wise)
    // However, if we just toggled a selection locally, we wouldn't call update.
    // We only call update from main.ts when state changes.
    // So yes, resetting here is correct.
    this.selectedDiceIndices.clear();
    this.selectedSkillId = null;

    this.render(view);
  }

  private render(view: GameView): void {
    this.root.innerHTML = '';

    // Header
    const header = document.createElement('header');
    header.innerHTML = `<h1>Flyer Dungeon</h1>`;
    this.root.appendChild(header);

    // Game Status
    const statusDiv = document.createElement('div');
    statusDiv.className = `game-status status-${view.gameStatus}`;
    let statusText = 'Playing';
    if (view.gameStatus === 'won') statusText = 'You Won! 🎉';
    if (view.gameStatus === 'lost') statusText = 'Game Over 💀';
    statusDiv.textContent = statusText;
    this.root.appendChild(statusDiv);

    // Main Game Area (only if playing or just finished)
    const mainContainer = document.createElement('div');
    mainContainer.style.display = 'flex';
    mainContainer.style.flexDirection = 'column';
    mainContainer.style.gap = '20px';

    // Dice Section
    const diceSection = document.createElement('div');
    diceSection.className = 'dice-section';

    // Dice Container
    const diceContainer = document.createElement('div');
    diceContainer.className = 'dice-container';

    if (view.dice.length > 0) {
      view.dice.forEach((value, index) => {
        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = value.toString();

        // Handle visual state
        if (this.selectedDiceIndices.has(index)) {
          die.classList.add('selected');
        }
        if (this.selectedSkillId) {
          die.classList.add('target-mode');
        }

        die.onclick = () => this.handleDieClick(index, view);
        diceContainer.appendChild(die);
      });
    } else {
      const msg = document.createElement('div');
      msg.textContent = "Roll the dice to start!";
      diceContainer.appendChild(msg);
    }
    diceSection.appendChild(diceContainer);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'controls';

    const rollButton = document.createElement('button');
    const rollsLeft = view.rolls.max - view.rolls.current;

    if (view.dice.length === 0) {
      rollButton.textContent = 'Roll Dice';
      rollButton.disabled = !view.rolls.canRoll;
      rollButton.onclick = () => this.onRoll();
    } else {
        // If dice exist
        if (this.selectedDiceIndices.size > 0) {
            rollButton.textContent = `Reroll Selected (${this.selectedDiceIndices.size})`;
            rollButton.onclick = () => this.onReroll(Array.from(this.selectedDiceIndices));
        } else {
            // Nothing selected
             rollButton.textContent = 'Select Dice to Reroll';
             // If we want to allow rerolling 0 dice (skip roll?), probably not useful but the rules don't strictly forbid passing empty list (which wastes a roll).
             // But usually you must reroll at least one.
             // Let's keep it clickable but maybe warn or just act as 'pass'?
             // Actually, usually in these games if you don't select anything, you can't reroll.
             // But let's check view.rolls.canRoll
             rollButton.disabled = true;
        }

        // If we can't roll anymore
        if (!view.rolls.canRoll) {
             rollButton.textContent = 'No Rolls Left';
             rollButton.disabled = true;
        }
    }

    controls.appendChild(rollButton);

    const rollInfo = document.createElement('div');
    rollInfo.className = 'roll-info';
    rollInfo.textContent = `Rolls left: ${rollsLeft} / ${view.rolls.max}`;
    controls.appendChild(rollInfo);

    // Instructions
    const instruction = document.createElement('div');
    instruction.className = 'instructions';
    if (this.selectedSkillId) {
        instruction.textContent = `Select a die to apply ${view.skills[this.selectedSkillId].name}`;
        instruction.style.color = 'var(--secondary-variant)';
        instruction.style.fontWeight = 'bold';
    } else if (view.gameStatus === 'playing') {
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

    // Skills Section
    const skillsSection = document.createElement('div');
    skillsSection.className = 'skills-section';

    Object.values(view.skills).forEach(skill => {
        const card = document.createElement('div');
        card.className = `skill-card group-${this.getSkillGroupClass(skill.id)} ${skill.status}`;
        if (this.selectedSkillId === skill.id) {
            card.classList.add('selected');
        }

        const name = document.createElement('div');
        name.className = 'skill-name';
        name.textContent = skill.name;

        const desc = document.createElement('div');
        desc.className = 'skill-desc';
        desc.textContent = skill.effectDescription;

        card.appendChild(name);
        card.appendChild(desc);

        if (skill.status === 'available') {
            card.onclick = () => this.handleSkillClick(skill.id, view);
        }

        skillsSection.appendChild(card);
    });
    mainContainer.appendChild(skillsSection);

    // Categories Section
    const categoriesSection = document.createElement('div');
    categoriesSection.className = 'categories-container';

    const groups: CategoryGroup[] = ['dungeon', 'str', 'dex', 'int'];

    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'category-group';

        const title = document.createElement('h3');
        title.textContent = group === 'dungeon' ? 'Dungeon Floor' : `${group.toUpperCase()} Check`;
        groupDiv.appendChild(title);

        view.categories.filter(c => c.group === group).forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-item';
            if (cat.isChecked) item.classList.add('checked');
            if (cat.isSelectable) {
                item.classList.add('selectable');
                item.onclick = () => this.onSelectCategory(cat.id);
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'category-name';
            nameSpan.textContent = this.formatCategoryName(cat.id);

            const statusSpan = document.createElement('span');
            statusSpan.className = 'category-status';
            statusSpan.innerHTML = cat.isChecked ? '&#10003;' : (cat.isSelectable ? '&#9675;' : ''); // Checkmark or Circle

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

  private handleDieClick(index: number, view: GameView) {
      if (view.gameStatus !== 'playing') return;

      if (this.selectedSkillId) {
          // Confirm skill use
          this.onUseSkill(this.selectedSkillId, index);
          // Selection will be cleared in next update
      } else {
          // Toggle reroll selection
          if (this.selectedDiceIndices.has(index)) {
              this.selectedDiceIndices.delete(index);
          } else {
              this.selectedDiceIndices.add(index);
          }
          // Re-render locally to show selection (this doesn't change game state)
          this.render(view);
      }
  }

  private handleSkillClick(skillId: SkillId, view: GameView) {
      if (this.selectedSkillId === skillId) {
          // Deselect
          this.selectedSkillId = null;
      } else {
          this.selectedSkillId = skillId;
          this.selectedDiceIndices.clear(); // Clear dice selection if switching to skill mode
      }
      this.render(view);
  }

  // Helpers

  private getSkillGroupClass(id: SkillId): string {
      if (id.includes('str')) return 'str';
      if (id.includes('dex')) return 'dex';
      if (id.includes('int')) return 'int';
      return 'str';
  }

  private formatCategoryName(id: CategoryId): string {
      // Basic formatting to make IDs readable
      return id
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace('Str ', '')
        .replace('Dex ', '')
        .replace('Int ', '')
        .replace('Dungeon Floor ', 'Floor ');
  }
}

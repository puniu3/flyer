import { GameView, CategoryId, SkillId, DieValue, CategoryGroup, SkillStatus } from './types';
import { Translator } from './i18n';

export class Renderer {
  private root: HTMLElement;
  private onRoll: () => void;
  private onReroll: (indexesToReroll: number[]) => void;
  private onUseSkill: (skillId: SkillId, targetDieIndex: number) => void;
  private onSelectCategory: (categoryId: CategoryId) => void;
  private onGameOver: () => void;
  private onHold: () => void;
  private onRestart: () => void;
  private t: Translator;

  // selectedDiceIndices now represents "Held" dice
  private selectedDiceIndices: Set<number> = new Set();
  private selectedSkillId: SkillId | null = null;
  private recentlyCheckedCategories: Set<CategoryId> = new Set();

  constructor(
    root: HTMLElement,
    onRoll: () => void,
    onReroll: (indexesToReroll: number[]) => void,
    onUseSkill: (skillId: SkillId, targetDieIndex: number) => void,
    onSelectCategory: (categoryId: CategoryId) => void,
    onGameOver: () => void,
    onHold: () => void,
    onRestart: () => void,
    t: Translator
  ) {
    this.root = root;
    this.onRoll = onRoll;
    this.onReroll = onReroll;
    this.onUseSkill = onUseSkill;
    this.onSelectCategory = onSelectCategory;
    this.onGameOver = onGameOver;
    this.onHold = onHold;
    this.onRestart = onRestart;
    this.t = t;
  }

  update(view: GameView): void {
    // Reset selections only if a new turn started (dice cleared) or game over
    if (view.dice.length === 0 || view.gameStatus !== 'playing') {
      this.selectedDiceIndices.clear();
    }

    // Always clear skill selection on update (since skills are instant or one-time use)
    this.selectedSkillId = null;

    this.render(view);
  }

  private render(view: GameView): void {
    this.root.innerHTML = '';

    // Header
    const header = document.createElement('header');
    header.innerHTML = `<h1>${this.t('game_title')}</h1>`;
    this.root.appendChild(header);

    // Game Status (Removed "Playing" status)
    if (view.gameStatus !== 'playing') {
        const statusDiv = document.createElement('div');
        statusDiv.className = `game-status status-${view.gameStatus}`;
        
        let statusText = '';
        if (view.gameStatus === 'won') statusText = this.t('status_won');
        if (view.gameStatus === 'lost'){
          statusText = this.t('status_lost');
          this.onGameOver();
        }
        statusDiv.textContent = statusText;
        this.root.appendChild(statusDiv);

        statusDiv.animate([
            { opacity: 0, transform: 'scale(0.5) translateY(-50px)' },
            { opacity: 1, transform: 'scale(1.05) translateY(10px)', offset: 0.6 },
            { opacity: 1, transform: 'scale(1) translateY(0)' }
        ], {
            duration: 600,
            easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fill: 'forwards'
        });
    }

    // Main Game Area
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
        const dieWrapper = document.createElement('div');
        dieWrapper.className = 'die-wrapper';

        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = value.toString();

        // Handle visual state
        // If selected, it is HELD
        if (this.selectedDiceIndices.has(index)) {
          die.classList.add('selected');

          const label = document.createElement('div');
          label.className = 'held-label';
          label.textContent = this.t('label_held');
          die.appendChild(label);
        }

        if (this.selectedSkillId) {
          die.classList.add('target-mode');
        }

        die.onclick = () => this.handleDieClick(index, view);
        dieWrapper.appendChild(die);
        diceContainer.appendChild(dieWrapper);
      });
    } else {
      const msg = document.createElement('div');
      msg.textContent = this.t('msg_start');
      diceContainer.appendChild(msg);
    }
    diceSection.appendChild(diceContainer);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'controls';

    const rollButton = document.createElement('button');
    const rollsLeft = view.rolls.max - view.rolls.current;

    if (view.gameStatus !== 'playing') {
      rollButton.textContent = this.t('btn_play_again');
      rollButton.classList.add('btn-restart');
      rollButton.onclick = () => this.onRestart();
      rollButton.disabled = false;
    } else if (view.dice.length === 0) {
      rollButton.textContent = this.t('btn_roll_initial');
      rollButton.disabled = !view.rolls.canRoll;
      rollButton.onclick = () => this.onRoll();
    } else {
        if (!view.rolls.canRoll) {
             rollButton.textContent = this.t('btn_no_rolls');
             rollButton.disabled = true;
        } else {
             // Reroll Logic: Roll UNHELD dice
             rollButton.textContent = this.t('btn_roll', { current: rollsLeft, max: view.rolls.max });
             const unheldIndices = view.dice.map((_, i) => i).filter(i => !this.selectedDiceIndices.has(i));
             rollButton.onclick = () => this.onReroll(unheldIndices);
        }
    }

    controls.appendChild(rollButton);

    // Instructions
    const instruction = document.createElement('div');
    instruction.className = 'instructions';
    if (this.selectedSkillId) {
        const skillName = this.t(`skill_name_${this.selectedSkillId}`);
        instruction.textContent = this.t('instr_apply_skill', { skillName });
        instruction.style.color = 'var(--secondary-variant)';
        instruction.style.fontWeight = 'bold';
    } else if (view.gameStatus === 'playing') {
        if (view.dice.length === 0) {
             instruction.textContent = this.t('instr_start_turn');
        } else if (view.rolls.canRoll) {
             instruction.textContent = this.t('instr_mid_turn');
        } else {
             instruction.textContent = this.t('instr_choose_category');
        }
    }
    controls.appendChild(instruction);

    diceSection.appendChild(controls);

    mainContainer.appendChild(diceSection);

    // Skills Section
    const skillsSection = document.createElement('div');
    skillsSection.className = 'skills-section';

    // Calculate group counts for unlock progress
    const counts: Record<CategoryGroup, number> = { dungeon: 0, str: 0, dex: 0, int: 0 };
    view.categories.forEach(c => {
        if (c.isChecked) {
            counts[c.group]++;
        }
    });

    Object.values(view.skills).forEach(skill => {
        const card = document.createElement('div');
        card.className = `skill-card group-${this.getSkillGroupClass(skill.id)} ${skill.status}`;
        if (this.selectedSkillId === skill.id) {
            card.classList.add('selected');
        }

        const name = document.createElement('div');
        name.className = 'skill-name';
        name.textContent = this.t(`skill_name_${skill.id}`);

        const desc = document.createElement('div');
        desc.className = 'skill-desc';
        desc.textContent = this.t(`skill_desc_${skill.id}`);

        card.appendChild(name);
        card.appendChild(desc);

        // Show progress if locked
        if (skill.status === 'locked') {
            const group = this.getSkillGroupClass(skill.id);
            // Note: getSkillGroupClass returns 'str'/'dex'/'int' which matches CategoryGroup keys (except 'dungeon')
            // Using type assertion or check
            if (group !== 'dungeon') { // Should always be true for skills
                const current = counts[group as CategoryGroup] || 0;
                const progressDiv = document.createElement('div');
                progressDiv.className = 'skill-progress';
                progressDiv.textContent = this.t('label_unlock_progress', { current });
                card.appendChild(progressDiv);
            }
        }

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
        title.textContent = this.t(group === 'dungeon' ? 'header_dungeon' : `header_${group}`);
        groupDiv.appendChild(title);

        view.categories.filter(c => c.group === group).forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-item';
            if (cat.isChecked) {
                item.classList.add('checked');
                // Check if this is a newly checked category
                if (!this.recentlyCheckedCategories.has(cat.id)) {
                    item.classList.add('check-success');
                    this.recentlyCheckedCategories.add(cat.id);
                }
            } else {
                 // Ensure if it's unchecked (new game), we remove it from history
                 if (this.recentlyCheckedCategories.has(cat.id)) {
                     this.recentlyCheckedCategories.delete(cat.id);
                 }
            }

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

  // Internal interaction handlers

  private handleDieClick(index: number, view: GameView) {
      if (view.gameStatus !== 'playing') return;

      if (this.selectedSkillId) {
          // Confirm skill use
          this.onUseSkill(this.selectedSkillId, index);
      } else {
          // Toggle HOLD selection
          if (this.selectedDiceIndices.has(index)) {
              this.selectedDiceIndices.delete(index);
          } else {
              this.selectedDiceIndices.add(index);
          }
          this.onHold();
          this.render(view);
      }
  }

  private handleSkillClick(skillId: SkillId, view: GameView) {
      if (this.selectedSkillId === skillId) {
          // Deselect
          this.selectedSkillId = null;
      } else {
          this.selectedSkillId = skillId;
          this.selectedDiceIndices.clear(); // Clear held dice if switching to skill mode
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
      return this.t(`cat_${id}`);
  }
}

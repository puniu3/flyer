import { GameView, CategoryId, SkillId } from './types';

export class Renderer {
  private root: HTMLElement | null;
  private onRoll: () => void;
  private onReroll: (indexesToReroll: number[]) => void;
  private onUseSkill: (skillId: SkillId, targetDieIndex: number) => void;
  private onSelectCategory: (categoryId: CategoryId) => void;

  constructor(
    root: HTMLElement | null,
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
    if (!this.root) return;
    // TODO: Implement rendering logic
  }
}

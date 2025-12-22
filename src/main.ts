import { init, step, getView } from './rules';
import { Renderer } from './renderer';
import { GameState, PlayerAction, CategoryId, SkillId } from './types';

const root = document.getElementById('fd-stage')!;
let state: GameState = init();
const renderer = new Renderer(root, onRoll, onReroll, onUseSkill, onSelectCategory);
renderer.update(getView(state));

function handleInput(action: PlayerAction): void {
  state = step(state, action);
  const view = getView(state);
  renderer.update(view);
}

function onRoll(): void {
  handleInput({
    type: "roll_dice",
    indexesToReroll: [0, 1, 2, 3, 4]
  });
}

function onReroll(indexesToReroll: number[]): void {
  handleInput({
    type: "roll_dice",
    indexesToReroll
  });
}

function onUseSkill(skillId: SkillId, targetDieIndex: number): void {
  handleInput({
    type: "use_skill",
    skillId,
    targetDieIndex
  });
}

function onSelectCategory(categoryId: CategoryId): void {
  handleInput({
    type: "select_category",
    categoryId
  });
}

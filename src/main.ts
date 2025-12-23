import { init, step, getView } from './rules';
import { Renderer } from './renderer';
import { GameState, PlayerAction, CategoryId, SkillId } from './types';
import { playSound } from './playSound';
import { createTranslator } from './i18n';

const root = document.getElementById('fd-stage')!;
let state: GameState = init();

// Initialize i18n
const locale = navigator.language;
const t = createTranslator(locale);

const renderer = new Renderer(
  root,
  onRoll,
  onReroll,
  onUseSkill,
  onSelectCategory,
  onGameOver,
  onHold,
  onRestart,
  t // Inject translator
);
renderer.update(getView(state));

function handleInput(action: PlayerAction): void {
  state = step(state, action);
  const view = getView(state);
  renderer.update(view);
}

function onRoll(): void {
  onReroll([0, 1, 2, 3, 4]);
}

function onReroll(indexesToReroll: number[]): void {
  playSound('roll');
  handleInput({
    type: "roll_dice",
    indexesToReroll
  });
}

function onUseSkill(skillId: SkillId, targetDieIndex: number): void {
  if (skillId === 'skill_str_mighty') playSound('mighty');
  if (skillId === 'skill_dex_acrobatics') playSound('acrobatics');
  if (skillId === 'skill_int_metamorph') playSound('metamorph');

  handleInput({
    type: "use_skill",
    skillId,
    targetDieIndex
  });
}

function onSelectCategory(categoryId: CategoryId): void {
  if (categoryId === 'dungeon_floor_5') playSound('win');
  else if (categoryId.startsWith('dungeon_')) playSound('dungeon_progress');
  else playSound('attribute_gain');

  handleInput({
    type: "select_category",
    categoryId
  });
}

function onGameOver(): void {
  playSound('lose');
}

function onHold(): void {
  playSound('hold');
}

function onRestart(): void {
  playSound('roll');
  state = init();
  renderer.update(getView(state));
}

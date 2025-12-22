import { init, step, getView } from './rules';
import { Renderer } from './renderer';

const root = document.getElementById('fd-stage');
let state = init();
const renderer = new Renderer(root, onRoll, onReroll, onUseSkill, onSelectCategory);
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

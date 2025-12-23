export type Translator = (key: string, params?: Record<string, string | number>) => string;

const en: Record<string, string> = {
    // UI
    'game_title': 'Flyer Dungeon',
    'status_won': 'You Won! 🎉',
    'status_lost': 'Game Over 💀',
    'msg_start': 'Roll the dice to start!',
    'label_held': 'HELD',
    'btn_play_again': 'PLAY AGAIN ↺',
    'btn_roll_initial': 'ROLL DICE',
    'btn_no_rolls': 'NO ROLLS LEFT',
    'btn_roll': 'ROLL ({current}/{max})',
    'instr_apply_skill': 'Select a die to apply {skillName}',
    'instr_start_turn': 'Start your turn by rolling the dice.',
    'instr_mid_turn': 'Click dice to Hold, then Roll again. Or choose a category/skill.',
    'instr_choose_category': 'Choose a category to score.',
    'label_unlock_progress': 'Unlock: {current}/3',
    'header_dungeon': 'Dungeon Floor',
    'header_str': 'STR Check',
    'header_dex': 'DEX Check',
    'header_int': 'INT Check',

    // Categories
    'cat_dungeon_floor_1': 'Floor 1 (Sum 20+)',
    'cat_dungeon_floor_2': 'Floor 2 (Sum 24+)',
    'cat_dungeon_floor_3': 'Floor 3 (Sum 26+)',
    'cat_dungeon_floor_4': 'Floor 4 (Sum ≤ 9)',
    'cat_dungeon_floor_5': 'Floor 5 (Five of a Kind)',
    'cat_str_full_house': 'Full House',
    'cat_str_four_of_a_kind': 'Four of a Kind',
    'cat_str_three_of_a_kind_5': 'Three of a Kind (5s)',
    'cat_str_three_of_a_kind_6': 'Three of a Kind (6s)',
    'cat_dex_free': 'Free',
    'cat_dex_straight': 'Straight',
    'cat_dex_three_of_a_kind_1': 'Three of a Kind (1s)',
    'cat_dex_three_of_a_kind_2': 'Three of a Kind (2s)',
    'cat_int_one_pair': 'One Pair',
    'cat_int_two_pair': 'Two Pair',
    'cat_int_three_of_a_kind_3': 'Three of a Kind (3s)',
    'cat_int_three_of_a_kind_4': 'Three of a Kind (4s)',

    // Skills
    'skill_name_skill_str_mighty': 'Mighty',
    'skill_desc_skill_str_mighty': 'Set a die to 6',
    'skill_name_skill_dex_acrobatics': 'Acrobatics',
    'skill_desc_skill_dex_acrobatics': 'Reduce die value by 1 (min 1)',
    'skill_name_skill_int_metamorph': 'Metamorph',
    'skill_desc_skill_int_metamorph': 'Flip a die (1<->6, 2<->5, 3<->4)',

    // Guide Modal
    'guide_btn': '?',
    'guide_title': 'How to Play',
    'guide_roll_title': 'ROLL',
    'guide_roll_1': 'Roll 5 dice.',
    'guide_roll_2': 'You can roll up to 3 times total (2 re-rolls).',
    'guide_roll_3': 'Hold dice you want to keep, then roll again.',
    'guide_skill_title': 'USE SKILL',
    'guide_skill_1': 'Unlock skills by checking 3 categories in a stat.',
    'guide_skill_2': 'Each skill can be used once per turn.',
    'guide_write_title': 'SELECT',
    'guide_write_1': 'Check one category that matches your dice.',
    'guide_write_2': 'If nothing matches → Game Over!',
    'guide_write_3': 'Check Floor 5 → You Win!',
};

const ja: Record<string, string> = {
    // UI
    'game_title': 'チラシの裏ダンジョン',
    'status_won': '勝利！ 🎉',
    'status_lost': 'ゲームオーバー 💀',
    'msg_start': 'ダイスを振ってスタート！',
    'label_held': 'キープ',
    'btn_play_again': 'もう一度遊ぶ ↺',
    'btn_roll_initial': 'ダイスを振る',
    'btn_no_rolls': '残り回数なし',
    'btn_roll': '振り直し ({current}/{max})',
    'instr_apply_skill': '{skillName}を適用するダイスを選択',
    'instr_start_turn': 'ダイスを振ってターン開始',
    'instr_mid_turn': 'ダイスを選んで振り直すか、役・スキルを選んでください',
    'instr_choose_category': '役を選択してください',
    'label_unlock_progress': '解放: {current}/3',
    'header_dungeon': 'ダンジョン',
    'header_str': 'STR',
    'header_dex': 'DEX',
    'header_int': 'INT',

    // Categories
    'cat_dungeon_floor_1': '第1階層 (合計20以上)',
    'cat_dungeon_floor_2': '第2階層 (合計24以上)',
    'cat_dungeon_floor_3': '第3階層 (合計26以上)',
    'cat_dungeon_floor_4': '第4階層 (合計9以下)',
    'cat_dungeon_floor_5': '第5階層 (ファイブカード)',
    'cat_str_full_house': 'フルハウス',
    'cat_str_four_of_a_kind': 'フォーカード',
    'cat_str_three_of_a_kind_5': '5のスリーカード',
    'cat_str_three_of_a_kind_6': '6のスリーカード',
    'cat_dex_free': 'フリー',
    'cat_dex_straight': 'ストレート',
    'cat_dex_three_of_a_kind_1': '1のスリーカード',
    'cat_dex_three_of_a_kind_2': '2のスリーカード',
    'cat_int_one_pair': 'ワンペア',
    'cat_int_two_pair': 'ツーペア',
    'cat_int_three_of_a_kind_3': '3のスリーカード',
    'cat_int_three_of_a_kind_4': '4のスリーカード',

    // Skills
    'skill_name_skill_str_mighty': '剛力',
    'skill_desc_skill_str_mighty': 'ダイス1つを6にする',
    'skill_name_skill_dex_acrobatics': '軽業',
    'skill_desc_skill_dex_acrobatics': 'ダイスの値を1減らす(最小1)',
    'skill_name_skill_int_metamorph': '変身',
    'skill_desc_skill_int_metamorph': 'ダイスの裏表を反転(1<->6...)',

    // Guide Modal
    'guide_btn': '?',
    'guide_title': '遊び方',
    'guide_roll_title': '振る (ROLL)',
    'guide_roll_1': 'ダイスを5個振る。',
    'guide_roll_2': '合計3投までOK（2回振り直し）。',
    'guide_roll_3': '好きな目だけ残して振れるよ。',
    'guide_skill_title': '使う (SKILL)',
    'guide_skill_1': '習得済み(✔×3)のスキルを使用可。',
    'guide_skill_2': '各スキル、1ターンに各1回使用OK。',
    'guide_write_title': '書く (WRITE)',
    'guide_write_1': '条件を満たすマスを1つチェック。',
    'guide_write_2': 'どこも埋められない ⇒ 即ゲームオーバー！',
    'guide_write_3': 'B5Fをチェック ⇒ ゲームクリア！',
};

const dictionaries: Record<string, Record<string, string>> = { en, ja };

export function createTranslator(locale: string): Translator {
    const lang = locale.startsWith('ja') ? 'ja' : 'en';
    const dict = dictionaries[lang];

    return (key: string, params?: Record<string, string | number>) => {
        let text = dict[key] || key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                text = text.replace(`{${k}}`, String(v));
            }
        }
        return text;
    };
}

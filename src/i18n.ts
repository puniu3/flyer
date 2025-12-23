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
    'cat_dungeon_floor_5': 'Floor 5 (Yahtzee)',
    'cat_str_three_of_a_kind_5': 'Three of a Kind (5s)',
    'cat_str_three_of_a_kind_6': 'Three of a Kind (6s)',
    'cat_str_full_house': 'Full House',
    'cat_str_four_of_a_kind': 'Four of a Kind',
    'cat_dex_three_of_a_kind_1': 'Three of a Kind (1s)',
    'cat_dex_three_of_a_kind_2': 'Three of a Kind (2s)',
    'cat_dex_small_straight': 'Small Straight',
    'cat_dex_large_straight': 'Large Straight',
    'cat_int_three_of_a_kind_3': 'Three of a Kind (3s)',
    'cat_int_three_of_a_kind_4': 'Three of a Kind (4s)',
    'cat_int_one_pair': 'One Pair',
    'cat_int_two_pair': 'Two Pair',

    // Skills
    'skill_name_skill_str_mighty': 'Mighty',
    'skill_desc_skill_str_mighty': 'Set a die to 6',
    'skill_name_skill_dex_acrobatics': 'Acrobatics',
    'skill_desc_skill_dex_acrobatics': 'Reduce die value by 1 (min 1)',
    'skill_name_skill_int_metamorph': 'Metamorph',
    'skill_desc_skill_int_metamorph': 'Flip a die (1<->6, 2<->5, 3<->4)',
};

const ja: Record<string, string> = {
    // UI
    'game_title': 'フライヤーダンジョン',
    'status_won': '勝利！ 🎉',
    'status_lost': 'ゲームオーバー 💀',
    'msg_start': 'サイコロを振ってスタート！',
    'label_held': 'ホールド',
    'btn_play_again': 'もう一度遊ぶ ↺',
    'btn_roll_initial': 'サイコロを振る',
    'btn_no_rolls': '残り回数なし',
    'btn_roll': '振る ({current}/{max})',
    'instr_apply_skill': '{skillName}を適用するサイコロを選択',
    'instr_start_turn': 'サイコロを振ってターンを開始してください。',
    'instr_mid_turn': 'サイコロをホールドして振り直すか、役・スキルを選んでください。',
    'instr_choose_category': '役を選択してください。',
    'label_unlock_progress': '解放: {current}/3',
    'header_dungeon': 'ダンジョンフロア',
    'header_str': 'STR チェック',
    'header_dex': 'DEX チェック',
    'header_int': 'INT チェック',

    // Categories
    'cat_dungeon_floor_1': '地下1階 (合計20以上)',
    'cat_dungeon_floor_2': '地下2階 (合計24以上)',
    'cat_dungeon_floor_3': '地下3階 (合計26以上)',
    'cat_dungeon_floor_4': '地下4階 (合計9以下)',
    'cat_dungeon_floor_5': '地下5階 (ヤッツィー)',
    'cat_str_three_of_a_kind_5': 'スリーカード (5)',
    'cat_str_three_of_a_kind_6': 'スリーカード (6)',
    'cat_str_full_house': 'フルハウス',
    'cat_str_four_of_a_kind': 'フォーカード',
    'cat_dex_three_of_a_kind_1': 'スリーカード (1)',
    'cat_dex_three_of_a_kind_2': 'スリーカード (2)',
    'cat_dex_small_straight': 'スモールストレート',
    'cat_dex_large_straight': 'ラージストレート',
    'cat_int_three_of_a_kind_3': 'スリーカード (3)',
    'cat_int_three_of_a_kind_4': 'スリーカード (4)',
    'cat_int_one_pair': 'ワンペア',
    'cat_int_two_pair': 'ツーペア',

    // Skills
    'skill_name_skill_str_mighty': '剛力',
    'skill_desc_skill_str_mighty': 'サイコロ1つを6にする',
    'skill_name_skill_dex_acrobatics': '軽業',
    'skill_desc_skill_dex_acrobatics': 'サイコロの値を1減らす(最小1)',
    'skill_name_skill_int_metamorph': '変身',
    'skill_desc_skill_int_metamorph': 'サイコロの裏表を反転(1↔6...)',
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

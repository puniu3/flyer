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
    'header_str': 'STR',
    'header_dex': 'DEX',
    'header_int': 'INT',

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
    'skill_name_skill_int_metamorph': 'Polymorph', // Changed from Metamorph
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
    'guide_credit': '←Dev', // Changed from Creator (more casual)
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
    'skill_name_skill_str_mighty': '剛腕',
    'skill_desc_skill_str_mighty': 'ダイス1つを6にする',
    'skill_name_skill_dex_acrobatics': '軽業',
    'skill_desc_skill_dex_acrobatics': 'ダイスの値を1減らす(最小1)',
    'skill_name_skill_int_metamorph': '変身',
    'skill_desc_skill_int_metamorph': 'ダイスの裏表を反転(1<->6...)',

    // Guide Modal
    'guide_btn': '?',
    'guide_title': '遊び方',
    'guide_roll_title': '振る',
    'guide_roll_1': 'ダイスを5個振る',
    'guide_roll_2': '好きな目だけ残して振り直し',
    'guide_roll_3': '合計3投まで',
    'guide_skill_title': 'スキルを使う',
    'guide_skill_1': '習得済み(✔×3)のスキルを使用可',
    'guide_skill_2': '各スキル、1ターンに各1回使用OK',
    'guide_write_title': '埋める',
    'guide_write_1': '条件を満たすマスを1つチェック',
    'guide_write_2': 'どこも埋められない ⇒ 即ゲームオーバー！',
    'guide_write_3': '第5階層をチェック ⇒ ゲームクリア！',
    'guide_credit': '←作った人',
};

const zh: Record<string, string> = {
    // UI
    'game_title': '传单背面地下城',
    'status_won': '胜利！ 🎉',
    'status_lost': '游戏结束 💀',
    'msg_start': '掷骰子开始！',
    'label_held': '保留',
    'btn_play_again': '再玩一次 ↺',
    'btn_roll_initial': '掷骰子',
    'btn_no_rolls': '无剩余次数',
    'btn_roll': '重掷 ({current}/{max})',
    'instr_apply_skill': '选择要对其使用{skillName}的骰子',
    'instr_start_turn': '掷骰子开始回合',
    'instr_mid_turn': '选择骰子重掷，或选择组合/技能',
    'instr_choose_category': '请选择一个组合',
    'label_unlock_progress': '解锁: {current}/3',
    'header_dungeon': '地下城',
    'header_str': 'STR',
    'header_dex': 'DEX',
    'header_int': 'INT',

    // Categories
    'cat_dungeon_floor_1': '地下1层 (总点数20以上)',
    'cat_dungeon_floor_2': '地下2层 (总点数24以上)',
    'cat_dungeon_floor_3': '地下3层 (总点数26以上)',
    'cat_dungeon_floor_4': '地下4层 (总点数9以下)',
    'cat_dungeon_floor_5': '地下5层 (五条)',
    'cat_str_full_house': '葫芦',
    'cat_str_four_of_a_kind': '四条',
    'cat_str_three_of_a_kind_5': '5的三条',
    'cat_str_three_of_a_kind_6': '6的三条',
    'cat_dex_free': '自由',
    'cat_dex_straight': '顺子',
    'cat_dex_three_of_a_kind_1': '1的三条',
    'cat_dex_three_of_a_kind_2': '2的三条',
    'cat_int_one_pair': '一对',
    'cat_int_two_pair': '两对',
    'cat_int_three_of_a_kind_3': '3的三条',
    'cat_int_three_of_a_kind_4': '4的三条',

    // Skills
    'skill_name_skill_str_mighty': '蛮力',
    'skill_desc_skill_str_mighty': '将一颗骰子设为6',
    'skill_name_skill_dex_acrobatics': '轻功',
    'skill_desc_skill_dex_acrobatics': '骰子点数减1（最小1）',
    'skill_name_skill_int_metamorph': '变形',
    'skill_desc_skill_int_metamorph': '翻转骰子（1<->6, 2<->5, 3<->4）',

    // Guide Modal
    'guide_btn': '?',
    'guide_title': '游戏规则',
    'guide_roll_title': '掷骰',
    'guide_roll_1': '掷5颗骰子',
    'guide_roll_2': '保留想要的骰子，重掷其余的',
    'guide_roll_3': '最多掷3次',
    'guide_skill_title': '使用技能',
    'guide_skill_1': '达成3个✔后解锁对应技能',
    'guide_skill_2': '每技能每回合可使用1次',
    'guide_write_title': '选择',
    'guide_write_1': '勾选一个满足条件的格子',
    'guide_write_2': '无法勾选任何格子 ⇒ 游戏结束！',
    'guide_write_3': '勾选地下5层 ⇒ 通关！',
    'guide_credit': '←作者',
};

const zhTW: Record<string, string> = {
    // UI
    'game_title': '傳單背面地下城',
    'status_won': '勝利！ 🎉',
    'status_lost': '遊戲結束 💀',
    'msg_start': '擲骰子開始！',
    'label_held': '保留',
    'btn_play_again': '再玩一次 ↺',
    'btn_roll_initial': '擲骰子',
    'btn_no_rolls': '無剩餘次數',
    'btn_roll': '重擲 ({current}/{max})',
    'instr_apply_skill': '選擇要對其使用 {skillName} 的骰子',
    'instr_start_turn': '擲骰子開始回合',
    'instr_mid_turn': '選擇骰子重擲，或選擇組合/技能',
    'instr_choose_category': '請選擇一個組合',
    'label_unlock_progress': '解鎖: {current}/3',
    'header_dungeon': '地下城',
    'header_str': 'STR',
    'header_dex': 'DEX',
    'header_int': 'INT',

    // Categories
    'cat_dungeon_floor_1': '地下 1 層 (總點數 20 以上)',
    'cat_dungeon_floor_2': '地下 2 層 (總點數 24 以上)',
    'cat_dungeon_floor_3': '地下 3 層 (總點數 26 以上)',
    'cat_dungeon_floor_4': '地下 4 層 (總點數 9 以下)',
    'cat_dungeon_floor_5': '地下 5 層 (五條)',
    'cat_str_full_house': '葫蘆',
    'cat_str_four_of_a_kind': '四條',
    'cat_str_three_of_a_kind_5': '5 的三條',
    'cat_str_three_of_a_kind_6': '6 的三條',
    'cat_dex_free': '自由',
    'cat_dex_straight': '順子',
    'cat_dex_three_of_a_kind_1': '1 的三條',
    'cat_dex_three_of_a_kind_2': '2 的三條',
    'cat_int_one_pair': '一對',
    'cat_int_two_pair': '兩對',
    'cat_int_three_of_a_kind_3': '3 的三條',
    'cat_int_three_of_a_kind_4': '4 的三條',

    // Skills
    'skill_name_skill_str_mighty': '蠻力',
    'skill_desc_skill_str_mighty': '將一顆骰子設為 6',
    'skill_name_skill_dex_acrobatics': '輕功',
    'skill_desc_skill_dex_acrobatics': '骰子點數減 1 (最小 1)',
    'skill_name_skill_int_metamorph': '變形',
    'skill_desc_skill_int_metamorph': '翻轉骰子 (1<->6, 2<->5, 3<->4)',

    // Guide Modal
    'guide_btn': '?',
    'guide_title': '遊戲規則',
    'guide_roll_title': '擲骰',
    'guide_roll_1': '擲 5 顆骰子',
    'guide_roll_2': '保留想要的骰子，重擲其餘的',
    'guide_roll_3': '最多擲 3 次',
    'guide_skill_title': '使用技能',
    'guide_skill_1': '達成 3 個 ✔ 後解鎖對應技能',
    'guide_skill_2': '每個技能每回合可使用 1 次',
    'guide_write_title': '選擇',
    'guide_write_1': '勾選一個滿足條件的格子',
    'guide_write_2': '無法勾選任何格子 ⇒ 遊戲結束！',
    'guide_write_3': '勾選地下 5 層 ⇒ 通關！',
    'guide_credit': '←作者',
};

const ko: Record<string, string> = {
    // UI
    'game_title': '전단지 뒷면 던전',
    'status_won': '승리! 🎉',
    'status_lost': '게임 오버 💀',
    'msg_start': '주사위를 굴려 시작하세요!',
    'label_held': '킵',
    'btn_play_again': '다시 하기 ↺',
    'btn_roll_initial': '주사위 굴리기',
    'btn_no_rolls': '기회 없음',
    'btn_roll': '다시 굴리기 ({current}/{max})',
    'instr_apply_skill': '{skillName} 스킬을 사용할 주사위를 선택하세요',
    'instr_start_turn': '주사위를 굴려 턴 시작',
    'instr_mid_turn': '주사위를 킵하고 굴리거나, 족보/스킬을 선택하세요',
    'instr_choose_category': '족보를 선택하세요',
    'label_unlock_progress': '해금: {current}/3',
    'header_dungeon': '던전',
    'header_str': 'STR',
    'header_dex': 'DEX',
    'header_int': 'INT',

    // Categories
    'cat_dungeon_floor_1': '지하 1층 (합계 20 이상)',
    'cat_dungeon_floor_2': '지하 2층 (합계 24 이상)',
    'cat_dungeon_floor_3': '지하 3층 (합계 26 이상)',
    'cat_dungeon_floor_4': '지하 4층 (합계 9 이하)',
    'cat_dungeon_floor_5': '지하 5층 (파이브 카드)',
    'cat_str_full_house': '풀하우스',
    'cat_str_four_of_a_kind': '포 카드',
    'cat_str_three_of_a_kind_5': '5의 쓰리 카드',
    'cat_str_three_of_a_kind_6': '6의 쓰리 카드',
    'cat_dex_free': '프리',
    'cat_dex_straight': '스트레이트',
    'cat_dex_three_of_a_kind_1': '1의 쓰리 카드',
    'cat_dex_three_of_a_kind_2': '2의 쓰리 카드',
    'cat_int_one_pair': '원 페어',
    'cat_int_two_pair': '투 페어',
    'cat_int_three_of_a_kind_3': '3의 쓰리 카드',
    'cat_int_three_of_a_kind_4': '4의 쓰리 카드',

    // Skills
    'skill_name_skill_str_mighty': '괴력',
    'skill_desc_skill_str_mighty': '주사위 1개를 6으로 설정',
    'skill_name_skill_dex_acrobatics': '곡예',
    'skill_desc_skill_dex_acrobatics': '주사위 눈 1 감소 (최소 1)',
    'skill_name_skill_int_metamorph': '변신',
    'skill_desc_skill_int_metamorph': '주사위 뒤집기 (1↔6...)',

    // Guide Modal
    'guide_btn': '?',
    'guide_title': '게임 방법',
    'guide_roll_title': '굴리기',
    'guide_roll_1': '주사위 5개를 굴립니다.',
    'guide_roll_2': '원하는 주사위는 킵(Hold)하고 나머지를 다시 굴립니다.',
    'guide_roll_3': '한 턴에 총 3번까지 굴릴 수 있습니다.',
    'guide_skill_title': '스킬 사용',
    'guide_skill_1': '각 능력치에서 3개를 달성(✔)하면 스킬이 해금됩니다.',
    'guide_skill_2': '각 스킬은 턴마다 1번씩 사용할 수 있습니다.',
    'guide_write_title': '기록하기',
    'guide_write_1': '조건을 만족하는 칸을 하나 선택해 체크하세요.',
    'guide_write_2': '체크할 곳이 없다면 ⇒ 게임 오버!',
    'guide_write_3': '지하 5층을 체크하면 ⇒ 게임 클리어!',
    'guide_credit': '←만든 사람', 
};

const de: Record<string, string> = {
    // UI
    'game_title': 'Flyer Dungeon',
    'status_won': 'Gewonnen! 🎉',
    'status_lost': 'Game Over 💀',
    'msg_start': 'Würfle zum Starten!',
    'label_held': 'HALTEN',
    'btn_play_again': 'NOCHMAL ↺',
    'btn_roll_initial': 'WÜRFELN',
    'btn_no_rolls': 'KEINE WÜRFE',
    'btn_roll': 'WÜRFELN ({current}/{max})',
    'instr_apply_skill': 'Wähle einen Würfel für {skillName}',
    'instr_start_turn': 'Würfle, um den Zug zu starten.',
    'instr_mid_turn': 'Würfel halten und neu werfen. Oder Kategorie/Skill wählen.',
    'instr_choose_category': 'Wähle eine Kategorie.',
    'label_unlock_progress': 'Freischalten: {current}/3',
    'header_dungeon': 'Dungeon-Ebene',
    'header_str': 'STR',
    'header_dex': 'DEX',
    'header_int': 'INT',

    // Categories
    'cat_dungeon_floor_1': 'Ebene 1 (Summe 20+)',
    'cat_dungeon_floor_2': 'Ebene 2 (Summe 24+)',
    'cat_dungeon_floor_3': 'Ebene 3 (Summe 26+)',
    'cat_dungeon_floor_4': 'Ebene 4 (Summe ≤ 9)',
    'cat_dungeon_floor_5': 'Ebene 5 (Fünferpasch)',
    'cat_str_full_house': 'Full House',
    'cat_str_four_of_a_kind': 'Viererpasch',
    'cat_str_three_of_a_kind_5': 'Dreierpasch (5er)',
    'cat_str_three_of_a_kind_6': 'Dreierpasch (6er)',
    'cat_dex_free': 'Freie Wahl',
    'cat_dex_straight': 'Straße',
    'cat_dex_three_of_a_kind_1': 'Dreierpasch (1er)',
    'cat_dex_three_of_a_kind_2': 'Dreierpasch (2er)',
    'cat_int_one_pair': 'Ein Paar',
    'cat_int_two_pair': 'Zwei Paare',
    'cat_int_three_of_a_kind_3': 'Dreierpasch (3er)',
    'cat_int_three_of_a_kind_4': 'Dreierpasch (4er)',

    // Skills
    'skill_name_skill_str_mighty': 'Kraft',
    'skill_desc_skill_str_mighty': 'Einen Würfel auf 6 setzen',
    'skill_name_skill_dex_acrobatics': 'Akrobatik',
    'skill_desc_skill_dex_acrobatics': 'Würfelwert um 1 verringern (min 1)',
    'skill_name_skill_int_metamorph': 'Verwandlung',
    'skill_desc_skill_int_metamorph': 'Würfel umdrehen (1<->6, 2<->5...)',

    // Guide Modal
    'guide_btn': '?',
    'guide_title': 'Spielregeln',
    'guide_roll_title': 'WÜRFELN',
    'guide_roll_1': 'Wirf 5 Würfel.',
    'guide_roll_2': 'Halte gewünschte Würfel und wirf den Rest neu.',
    'guide_roll_3': 'Maximal 3 Würfe pro Zug.',
    'guide_skill_title': 'SKILLS',
    'guide_skill_1': 'Erfülle 3 Kategorien in einem Attribut, um Skills freizuschalten.',
    'guide_skill_2': 'Jeder Skill kann einmal pro Zug genutzt werden.',
    'guide_write_title': 'WÄHLEN',
    'guide_write_1': 'Wähle ein Feld, das die Bedingung erfüllt.',
    'guide_write_2': 'Kein passendes Feld? → Game Over!',
    'guide_write_3': 'Ebene 5 erreicht? → Gewonnen!',
    'guide_credit': '←Dev',
};

const fr: Record<string, string> = {
    // UI
    'game_title': 'Flyer Dungeon',
    'status_won': 'Gagné ! 🎉',
    'status_lost': 'Game Over 💀',
    'msg_start': 'Lancez les dés pour commencer !',
    'label_held': 'GARDÉ',
    'btn_play_again': 'REJOUER ↺',
    'btn_roll_initial': 'LANCER',
    'btn_no_rolls': 'PLUS DE LANCERS',
    'btn_roll': 'RELANCER ({current}/{max})',
    'instr_apply_skill': 'Sélectionnez un dé pour {skillName}',
    'instr_start_turn': 'Lancez les dés pour commencer le tour.',
    'instr_mid_turn': 'Gardez des dés et relancez. Ou choisissez une catégorie/compétence.',
    'instr_choose_category': 'Choisissez une catégorie.',
    'label_unlock_progress': 'Débloqué : {current}/3',
    'header_dungeon': 'Donjon',
    'header_str': 'FOR',
    'header_dex': 'DEX',
    'header_int': 'INT',

    // Categories
    'cat_dungeon_floor_1': 'Niveau 1 (Somme 20+)',
    'cat_dungeon_floor_2': 'Niveau 2 (Somme 24+)',
    'cat_dungeon_floor_3': 'Niveau 3 (Somme 26+)',
    'cat_dungeon_floor_4': 'Niveau 4 (Somme ≤ 9)',
    'cat_dungeon_floor_5': 'Niveau 5 (Yams)',
    'cat_str_full_house': 'Full',
    'cat_str_four_of_a_kind': 'Carré',
    'cat_str_three_of_a_kind_5': 'Brelan de 5',
    'cat_str_three_of_a_kind_6': 'Brelan de 6',
    'cat_dex_free': 'Libre',
    'cat_dex_straight': 'Suite',
    'cat_dex_three_of_a_kind_1': 'Brelan de 1',
    'cat_dex_three_of_a_kind_2': 'Brelan de 2',
    'cat_int_one_pair': 'Une paire',
    'cat_int_two_pair': 'Deux paires',
    'cat_int_three_of_a_kind_3': 'Brelan de 3',
    'cat_int_three_of_a_kind_4': 'Brelan de 4',

    // Skills
    'skill_name_skill_str_mighty': 'Puissance',
    'skill_desc_skill_str_mighty': 'Mettre un dé sur 6',
    'skill_name_skill_dex_acrobatics': 'Acrobatie',
    'skill_desc_skill_dex_acrobatics': 'Réduire un dé de 1 (min 1)',
    'skill_name_skill_int_metamorph': 'Polymorphie',
    'skill_desc_skill_int_metamorph': 'Inverser un dé (1<->6...)',

    // Guide Modal
    'guide_btn': '?',
    'guide_title': 'Règles',
    'guide_roll_title': 'LANCER',
    'guide_roll_1': 'Lancez 5 dés.',
    'guide_roll_2': 'Gardez les dés voulus, relancez le reste.',
    'guide_roll_3': 'Max 3 lancers au total.',
    'guide_skill_title': 'COMPÉTENCES',
    'guide_skill_1': 'Validez 3 catégories d\'une stat pour débloquer.',
    'guide_skill_2': '1 utilisation par compétence par tour.',
    'guide_write_title': 'CHOISIR',
    'guide_write_1': 'Cochez une case valide.',
    'guide_write_2': 'Rien à cocher ? → Perdu !',
    'guide_write_3': 'Niveau 5 coché ? → Gagné !',
    'guide_credit': '←Dev',
};

const es: Record<string, string> = {
    // UI
    'game_title': 'Flyer Dungeon',
    'status_won': '¡Has Ganado! 🎉',
    'status_lost': 'Fin del Juego 💀',
    'msg_start': '¡Lanza los dados para empezar!',
    'label_held': 'GUARDADO',
    'btn_play_again': 'JUGAR DE NUEVO ↺',
    'btn_roll_initial': 'LANZAR',
    'btn_no_rolls': 'SIN TIROS',
    'btn_roll': 'RELANZAR ({current}/{max})',
    'instr_apply_skill': 'Elige un dado para {skillName}',
    'instr_start_turn': 'Lanza los dados para empezar tu turno.',
    'instr_mid_turn': 'Guarda dados y relanza. O elige categoría/habilidad.',
    'instr_choose_category': 'Elige una categoría.',
    'label_unlock_progress': 'Desbloqueo: {current}/3',
    'header_dungeon': 'Mazmorra',
    'header_str': 'FUE',
    'header_dex': 'DES',
    'header_int': 'INT',

    // Categories
    'cat_dungeon_floor_1': 'Nivel 1 (Suma 20+)',
    'cat_dungeon_floor_2': 'Nivel 2 (Suma 24+)',
    'cat_dungeon_floor_3': 'Nivel 3 (Suma 26+)',
    'cat_dungeon_floor_4': 'Nivel 4 (Suma ≤ 9)',
    'cat_dungeon_floor_5': 'Nivel 5 (Generala)',
    'cat_str_full_house': 'Full',
    'cat_str_four_of_a_kind': 'Póker',
    'cat_str_three_of_a_kind_5': 'Trío de 5',
    'cat_str_three_of_a_kind_6': 'Trío de 6',
    'cat_dex_free': 'Libre',
    'cat_dex_straight': 'Escalera',
    'cat_dex_three_of_a_kind_1': 'Trío de 1',
    'cat_dex_three_of_a_kind_2': 'Trío de 2',
    'cat_int_one_pair': 'Un par',
    'cat_int_two_pair': 'Dos pares',
    'cat_int_three_of_a_kind_3': 'Trío de 3',
    'cat_int_three_of_a_kind_4': 'Trío de 4',

    // Skills
    'skill_name_skill_str_mighty': 'Poder',
    'skill_desc_skill_str_mighty': 'Poner un dado en 6',
    'skill_name_skill_dex_acrobatics': 'Acrobacia',
    'skill_desc_skill_dex_acrobatics': 'Reducir dado en 1 (mín 1)',
    'skill_name_skill_int_metamorph': 'Polimorfia',
    'skill_desc_skill_int_metamorph': 'Invertir dado (1<->6...)',

    // Guide Modal
    'guide_btn': '?',
    'guide_title': 'Cómo Jugar',
    'guide_roll_title': 'LANZAR',
    'guide_roll_1': 'Lanza 5 dados.',
    'guide_roll_2': 'Guarda los que quieras, relanza el resto.',
    'guide_roll_3': 'Máx 3 tiros en total.',
    'guide_skill_title': 'HABILIDADES',
    'guide_skill_1': 'Desbloquea al cumplir 3 categorías de un atributo.',
    'guide_skill_2': '1 uso por habilidad por turno.',
    'guide_write_title': 'ELEGIR',
    'guide_write_1': 'Marca una casilla válida.',
    'guide_write_2': '¿Nada válido? → ¡Fin del Juego!',
    'guide_write_3': '¿Nivel 5 marcado? → ¡Ganaste!',
    'guide_credit': '←Dev',
};

const dictionaries: Record<string, Record<string, string>> = { en, ja, zh, 'zh-TW': zhTW, ko, de, fr, es };

export function createTranslator(locale: string): Translator {
    let lang = 'en';

    // specific variants first
    if (locale === 'zh-TW' || locale === 'zh-Hant' || locale.startsWith('zh-TW')) {
        lang = 'zh-TW';
    } else if (locale.startsWith('ja')) {
        lang = 'ja';
    } else if (locale.startsWith('zh')) {
        // Fallback for other zh variants (e.g. zh-CN)
        lang = 'zh';
    } else if (locale.startsWith('ko')) {
        lang = 'ko';
    } else if (locale.startsWith('de')) {
        lang = 'de';
    } else if (locale.startsWith('fr')) {
        lang = 'fr';
    } else if (locale.startsWith('es')) {
        lang = 'es';
    }
    
    // Fallback to English if exact key is missing in target language
    const dict = dictionaries[lang] || dictionaries['en'];

    return (key: string, params?: Record<string, string | number>) => {
        let text = dict[key] || en[key] || key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                text = text.replace(`{${k}}`, String(v));
            }
        }
        return text;
    };
}
import { createTranslator } from "./i18n";
const keys = ["board_dungeon", "board_str", "board_dex", "board_int", "five_kind", "roll", "reroll", "used", "completed", "die", "sound", "language", "loading", "load_error", "victory_copy", "loss_copy", "classic_link"];
const rows: Record<string, string[]> = {
  en: ["DUNGEON", "Strength", "Dexterity", "Intellect", "Five of a Kind", "Roll", "Reroll", "Used", "Completed", "Die", "Sound", "Language", "Preparing the table…", "Loading failed. Please reload.", "The fifth floor is complete.", "Your dice match no available category.", "Play the classic edition"],
  ja: ["ダンジョン", "筋力", "敏捷", "知力", "ファイブカード", "振る", "振り直し", "使用済み", "達成済み", "ダイス", "音声", "言語", "卓上を準備しています…", "読み込みに失敗しました。再読み込みしてください。", "地下5階を踏破しました。", "チェックできる項目がありません。", "旧版で遊ぶ"],
  zh: ["地下城", "力量", "敏捷", "智力", "五条", "掷骰", "重掷", "已使用", "已完成", "骰子", "声音", "语言", "正在准备游戏…", "加载失败，请刷新。", "已通关地下五层。", "没有可以勾选的项目。", "游玩旧版"],
  "zh-TW": ["地下城", "力量", "敏捷", "智力", "五條", "擲骰", "重擲", "已使用", "已完成", "骰子", "聲音", "語言", "正在準備遊戲…", "載入失敗，請重新整理。", "已通關地下五層。", "沒有可以勾選的項目。", "遊玩舊版"],
  ko: ["던전", "근력", "민첩", "지력", "파이브 카드", "굴리기", "다시 굴리기", "사용 완료", "달성 완료", "주사위", "소리", "언어", "게임 준비 중…", "불러오지 못했습니다. 새로고침해 주세요.", "지하 5층을 돌파했습니다.", "체크할 수 있는 항목이 없습니다.", "이전 버전 플레이"],
  de: ["VERLIES", "Stärke", "Geschick", "Intellekt", "Fünfling", "Würfeln", "Neuwurf", "Verbraucht", "Erfüllt", "Würfel", "Ton", "Sprache", "Spiel wird vorbereitet…", "Laden fehlgeschlagen. Bitte neu laden.", "Die fünfte Ebene ist geschafft.", "Keine offene Kategorie passt zu deinen Würfeln.", "Klassische Version spielen"],
  fr: ["DONJON", "Force", "Dextérité", "Intelligence", "Cinq identiques", "Lancer", "Relancer", "Utilisé", "Accompli", "Dé", "Son", "Langue", "Préparation du jeu…", "Échec du chargement. Veuillez recharger.", "Le cinquième étage est terminé.", "Vos dés ne correspondent à aucune catégorie disponible.", "Jouer à la version classique"],
  es: ["MAZMORRA", "Fuerza", "Destreza", "Intelecto", "Cinco iguales", "Lanzar", "Relanzar", "Usado", "Completado", "Dado", "Sonido", "Idioma", "Preparando el juego…", "Error de carga. Vuelve a cargar.", "Has superado el quinto piso.", "Tus dados no cumplen ninguna categoría disponible.", "Jugar a la versión clásica"],
};
export function translator(locale: string) {
  const original = createTranslator(locale);
  const extra = Object.fromEntries(keys.map((key, i) => [key, (rows[locale] ?? rows.en)[i]]));
  return (key: string) => locale === "en" && key === "cat_dex_free" ? "Any" : extra[key] ?? original(key);
}
export function fontFamily(locale: string) {
  const family = { ja: "Flyer JP", zh: "Flyer SC", "zh-TW": "Flyer TC", ko: "Flyer KR" }[locale];
  return family ? `"${family}", serif` : "Georgia, serif";
}
let registered = false;
export async function loadLocaleFont(locale: string) {
  if (!registered) {
    for (const region of ["JP", "SC", "TC", "KR"]) {
      document.fonts.add(new FontFace(`Flyer ${region}`, `url("${import.meta.env.BASE_URL}assets/fonts/noto-serif-${region.toLowerCase()}.ttf")`, { weight: "400" }));
    }
    registered = true;
  }
  await document.fonts.load(`32px ${fontFamily(locale)}`);
}

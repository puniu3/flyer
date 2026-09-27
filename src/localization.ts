import { createTranslator } from "./i18n";
const keys = ["board_dungeon", "board_str", "board_dex", "board_int", "five_kind", "roll", "reroll", "used", "completed", "die", "sound", "language", "loading", "load_error", "victory_copy", "loss_copy", "guide_continue"];
const rows: Record<string, string[]> = {
  en: ["DUNGEON", "Strength", "Dexterity", "Intellect", "FIVE OF A KIND", "Roll", "Reroll", "Used", "Completed", "Die", "Sound", "Language", "Preparing the table…", "Loading failed. Please reload.", "The fifth floor is complete.", "No category can be reached with the remaining skills.", "After the third roll, play continues while remaining skills can still produce a valid category."],
  ja: ["ダンジョン", "筋力", "敏捷", "知力", "ファイブカード", "振る", "振り直し", "使用済み", "達成済み", "ダイス", "音声", "言語", "卓上を準備しています…", "読み込みに失敗しました。再読み込みしてください。", "地下5階を踏破しました。", "残る技能を使っても、達成できる役がありません。", "3投目の後も、残る技能で役を作れる間は続けられます。"],
  zh: ["地下城", "力量", "敏捷", "智力", "五条", "掷骰", "重掷", "已使用", "已完成", "骰子", "声音", "语言", "正在准备游戏…", "加载失败，请刷新。", "已通关地下五层。", "使用剩余技能也无法达成任何组合。", "第三次掷骰后，只要剩余技能还能组成有效组合，就可以继续。"],
  "zh-TW": ["地下城", "力量", "敏捷", "智力", "五條", "擲骰", "重擲", "已使用", "已完成", "骰子", "聲音", "語言", "正在準備遊戲…", "載入失敗，請重新整理。", "已通關地下五層。", "使用剩餘技能也無法達成任何組合。", "第三次擲骰後，只要剩餘技能還能組成有效組合，就可以繼續。"],
  ko: ["던전", "근력", "민첩", "지력", "파이브 카드", "굴리기", "다시 굴리기", "사용 완료", "달성 완료", "주사위", "소리", "언어", "게임 준비 중…", "불러오지 못했습니다. 새로고침해 주세요.", "지하 5층을 돌파했습니다.", "남은 기술로도 달성할 수 있는 조합이 없습니다.", "세 번째 굴림 후에도 남은 기술로 유효한 조합을 만들 수 있으면 계속할 수 있습니다."],
  de: ["VERLIES", "Stärke", "Geschick", "Intellekt", "FÜNFLING", "Würfeln", "Neuwurf", "Verbraucht", "Erfüllt", "Würfel", "Ton", "Sprache", "Spiel wird vorbereitet…", "Laden fehlgeschlagen. Bitte neu laden.", "Die fünfte Ebene ist geschafft.", "Auch mit den übrigen Fähigkeiten ist keine Kombination mehr möglich.", "Nach dem dritten Wurf geht es weiter, solange übrige Fähigkeiten eine gültige Kombination ermöglichen."],
  fr: ["DONJON", "Force", "Dextérité", "Intelligence", "CINQ IDENTIQUES", "Lancer", "Relancer", "Utilisé", "Accompli", "Dé", "Son", "Langue", "Préparation du jeu…", "Échec du chargement. Veuillez recharger.", "Le cinquième étage est terminé.", "Aucune combinaison n’est possible avec les compétences restantes.", "Après le troisième lancer, vous pouvez continuer si les compétences restantes permettent une combinaison valide."],
  es: ["MAZMORRA", "Fuerza", "Destreza", "Intelecto", "CINCO IGUALES", "Lanzar", "Relanzar", "Usado", "Completado", "Dado", "Sonido", "Idioma", "Preparando el juego…", "Error de carga. Vuelve a cargar.", "Has superado el quinto piso.", "Las habilidades restantes no permiten completar ninguna combinación.", "Tras la tercera tirada, puedes continuar si las habilidades restantes permiten formar una combinación válida."],
};
export function translator(locale: string) {
  const original = createTranslator(locale);
  const extra = Object.fromEntries(keys.map((key, i) => [key, (rows[locale] ?? rows.en)[i]]));
  return (key: string) => locale === "en" && key === "cat_dex_free" ? "ANY" : extra[key] ?? original(key);
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

export const languages = [
  ["ja", "日本語"], ["en", "English"], ["zh", "简体中文"],
  ["zh-TW", "繁體中文"], ["ko", "한국어"], ["de", "Deutsch"],
  ["fr", "Français"], ["es", "Español"],
] as const;

export function resolveLanguage(...locales: string[]) {
  for (const locale of locales) {
    const tag = locale.toLowerCase();
    if (/^zh-(tw|hant)(-|$)/.test(tag)) return "zh-TW";
    const base = tag.split("-")[0];
    const supported = languages.find(([id]) => id === base);
    if (supported) return supported[0];
  }
  return "en";
}

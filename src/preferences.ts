export function readPreference(key: string, fallback: string) {
  try {
    return localStorage.getItem(`flyer:layout-b:${key}`) ?? fallback;
  } catch {
    return fallback;
  }
}
export function savePreference(key: string, value: string) {
  try {
    localStorage.setItem(`flyer:layout-b:${key}`, value);
  } catch {}
}

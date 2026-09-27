import { DEFAULT_CAMERA, type CameraSettings } from "./scene";
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
export function loadCamera(): CameraSettings {
  try {
    const v = JSON.parse(readPreference("camera", "null"));
    return {
      fov: finite(v?.fov, 22, 10, 45),
      elevation: finite(v?.elevation, DEFAULT_CAMERA.elevation, 25, 75),
      distance: finite(v?.distance, 1, 0.6, 1.8),
    };
  } catch {
    return { ...DEFAULT_CAMERA };
  }
}
function finite(v: unknown, fallback: number, min: number, max: number) {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;
}

import * as THREE from "three";

export function surfaceGrain(kind: "paper" | "felt" | "wood" | "edge") {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  let seed = 7139;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed / 4294967296 - 0.5);
    const wave = Math.sin(y * 0.32 + Math.sin(x * 0.021) * 1.8);
    const value = kind === "edge" ? 230 + Math.sin(y * Math.PI / 16) * 7 + noise * 3
      : kind === "wood" ? 215 + wave * 9 + noise * 5
      : kind === "felt" ? 230 + noise * 14 : 235 + noise * 7;
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = kind === "paper" ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(kind === "edge" ? 1 : kind === "wood" ? 2 : 4, kind === "wood" || kind === "edge" ? 1 : 4);
  texture.needsUpdate = true;
  return texture;
}

export function softMask(rectangle = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  if (rectangle) {
    context.shadowColor = "white";
    context.shadowBlur = 10;
    context.fillStyle = "white";
    context.fillRect(16, 16, 96, 96);
  } else {
    const gradient = context.createRadialGradient(64, 64, 12, 64, 64, 62);
    gradient.addColorStop(0, "rgba(255,255,255,.65)");
    gradient.addColorStop(0.48, "rgba(255,255,255,.4)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

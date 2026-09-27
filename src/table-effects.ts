import { AbilityEffects } from "./ability-effects";
import * as THREE from "three";
import { softMask } from "./table-finish";

const smooth = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
type Glow = { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; from: number; target: number; start: number };
type Foil = { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; origin: THREE.Vector3; angle: number; start: number; duration: number; travel: number };
export class TableEffects {
  private mask = softMask();
  private plane = new THREE.PlaneGeometry(1, 1);
  private glows: Glow[] = [];
  private foils: Foil[] = [];
  private serial = 0;
  readonly abilities: AbilityEffects;
  constructor(private world: THREE.Scene) {
    this.abilities = new AbilityEffects(world);
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(this.plane, new THREE.MeshBasicMaterial({
        map: this.mask, color: "#d2a65d", transparent: true, opacity: 0,
        depthWrite: false, toneMapped: false,
      }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.scale.setScalar(i === 0 ? 1.65 : 1.9);
      mesh.visible = false;
      this.world.add(mesh);
      this.glows.push({ mesh, from: 0, target: 0, start: 0 });
    }
  }
  select(chip: THREE.Vector3 | null, dice: THREE.Vector3[], surface: number) {
    const now = performance.now();
    this.glows.forEach((g, i) => {
      const target = chip ? (i === 0 ? 0.24 : 0.2) : 0;
      const position = i === 0 ? chip : dice[i - 1];
      if (position) g.mesh.position.set(position.x, i === 0 ? surface : 0.185, position.z);
      if (target !== g.target) {
        g.from = g.mesh.material.opacity;
        g.target = target;
        g.start = now;
      }
    });
  }
  burst(origin: THREE.Vector3, count: number, duration: number) {
    if (document.hidden) return;
    const serial = ++this.serial;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count + serial * 0.47;
      const mesh = new THREE.Mesh(this.plane, new THREE.MeshBasicMaterial({
        color: i % 2 ? "#b58b48" : "#d8b879", side: THREE.DoubleSide,
        transparent: true, opacity: 0, depthWrite: false,
      }));
      const size = 0.05 + (i % 3) * 0.014;
      mesh.scale.set(size, size * 0.62, 1);
      mesh.rotation.set(-0.65, angle, angle * 0.3);
      this.world.add(mesh);
      this.foils.push({ mesh, origin: origin.clone(), angle, start: performance.now(), duration, travel: 0.2 + (i % 4) * 0.045 });
    }
  }
  update(now: number) {
    let changing = false;
    for (const g of this.glows) {
      const p = (now - g.start) / 220;
      g.mesh.material.opacity = THREE.MathUtils.lerp(g.from, g.target, smooth(p));
      g.mesh.visible = g.mesh.material.opacity > 0.001;
      if (p < 1 && g.from !== g.target) changing = true;
    }
    this.foils = this.foils.filter((f) => {
      const p = Math.max(0, (now - f.start) / f.duration);
      if (p >= 1) {
        this.world.remove(f.mesh);
        f.mesh.material.dispose();
        return false;
      }
      const radius = 0.26 + f.travel * smooth(p);
      f.mesh.position.set(f.origin.x + Math.cos(f.angle) * radius,
        f.origin.y + 0.08 + Math.sin(p * Math.PI) * 0.3,
        f.origin.z + Math.sin(f.angle) * radius);
      f.mesh.rotation.z = f.angle * 0.3 + p * 0.55;
      f.mesh.material.opacity = 0.76 * smooth(p / 0.2) * (1 - smooth((p - 0.48) / 0.52));
      return true;
    });
    const abilityChanging = this.abilities.update(now);
    return changing || this.foils.length > 0 || abilityChanging;
  }
  clear() {
    this.abilities.clear();
    for (const f of this.foils) {
      this.world.remove(f.mesh);
      f.mesh.material.dispose();
    }
    this.foils = [];
    for (const g of this.glows) {
      g.target = g.from = g.mesh.material.opacity = 0;
      g.start = 0;
      g.mesh.visible = false;
    }
  }
  diagnostics() {
    return { abilities: this.abilities.diagnostics(), particles: this.foils.length, bursts: this.serial, glow: this.glows.map((g) => g.mesh.material.opacity) };
  }
}

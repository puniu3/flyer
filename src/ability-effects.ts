import * as THREE from "three";
import { softMask } from "./table-finish";
const ease = (value: number) => {
  const p = THREE.MathUtils.clamp(value, 0, 1);
  return p * p * (3 - 2 * p);
};
type EffectMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
type Spell = { kind: number; start: number; group: THREE.Group; glow: EffectMesh; arc: EffectMesh; particles: EffectMesh[] };
export class AbilityEffects {
  private spells: Spell[] = [];
  private mask = softMask();
  private plane = new THREE.PlaneGeometry(1, 1);
  private ring = new THREE.RingGeometry(0.93, 1, 64);
  private sweep = new THREE.RingGeometry(0.965, 1, 64, 1, 0, Math.PI * 1.25);
  private star: THREE.ShapeGeometry;
  private serial = 0;
  constructor(private world: THREE.Scene) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const r = i % 2 ? 0.18 : 0.5;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    this.star = new THREE.ShapeGeometry(shape);
  }
  start(origin: THREE.Vector3, kind: number) {
    if (document.hidden) return;
    const color = ["#d89560", "#bac482", "#c0a0ce"][kind];
    const mesh = (geometry: THREE.BufferGeometry, soft = false) => new THREE.Mesh(geometry,
      new THREE.MeshBasicMaterial({ color, map: soft ? this.mask : null, transparent: true,
        opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    const group = new THREE.Group();
    group.position.set(origin.x, 0.188, origin.z);
    const glow = mesh(this.plane, true);
    glow.rotation.x = -Math.PI / 2;
    glow.scale.setScalar(2.2);
    const arc = mesh(kind === 0 ? this.ring : this.sweep);
    arc.rotation.x = -Math.PI / 2;
    arc.position.y = 0.008;
    const particles = Array.from({ length: kind === 0 ? 6 : kind === 1 ? 7 : 10 }, (_, i) => {
      const particle = mesh(kind === 2 ? this.star : this.plane);
      particle.rotation.set(-Math.PI / 3, 0, i * 0.7);
      const size = kind === 0 ? 0.1 : kind === 1 ? 0.14 : 0.16;
      particle.scale.set(size, kind === 1 ? 0.025 : size, 1);
      return particle;
    });
    group.add(glow, arc, ...particles);
    this.world.add(group);
    this.spells.push({ kind, start: performance.now(), group, glow, arc, particles });
    this.serial++;
  }
  update(now: number) {
    this.spells = this.spells.filter(spell => {
      const elapsed = now - spell.start;
      if (elapsed >= 800) { this.remove(spell); return false; }
      const attack = ease(elapsed / 380);
      const release = 1 - ease((elapsed - 380) / 420);
      const impact = ease((elapsed - 300) / 80) * release;
      const travel = THREE.MathUtils.clamp((elapsed - 300) / 500, 0, 1);
      spell.glow.material.opacity = attack * release * (spell.kind === 2 ? 0.42 : 0.36);
      spell.arc.material.opacity = impact * (spell.kind === 0 ? 0.4 : 0.65);
      const radius = spell.kind === 0 ? 0.62 + travel * 0.64 : 0.8 + travel * 0.2;
      spell.arc.scale.setScalar(radius);
      spell.arc.rotation.z = spell.kind === 0 ? 0 : elapsed / (spell.kind === 1 ? 150 : 340);
      spell.particles.forEach((particle, i) => {
        const angle = i * Math.PI * 2 / spell.particles.length + (spell.kind === 0 ? 0 : travel * (spell.kind === 1 ? 3 : 4));
        const distance = spell.kind === 0 ? 0.48 + travel * 0.68 : 0.72 + travel * 0.14;
        const height = spell.kind === 0 ? Math.sin(travel * Math.PI) * 0.25
          : spell.kind === 1 ? 0.1 + Math.sin(travel * Math.PI) * 0.32
          : 0.12 + travel * 0.9 + (i % 3) * 0.08;
        particle.position.set(Math.cos(angle) * distance, 0.025 + height, Math.sin(angle) * distance);
        particle.rotation.z = angle + (spell.kind === 1 ? Math.PI / 2 : 0);
        particle.material.opacity = impact * (spell.kind === 2 ? 0.85 : 0.75);
      });
      return true;
    });
    return this.spells.length > 0;
  }
  private remove(spell: Spell) {
    this.world.remove(spell.group);
    for (const mesh of [spell.glow, spell.arc, ...spell.particles]) mesh.material.dispose();
  }
  clear() {
    this.spells.forEach(spell => this.remove(spell));
    this.spells = [];
  }
  diagnostics() {
    return { active: this.spells.map(spell => spell.kind), count: this.serial };
  }
}

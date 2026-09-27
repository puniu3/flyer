import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  slots,
  GROUPS,
  COLORS,
  TRAY,
  SKILL_Z,
  SKILLS,
  assetUrl,
} from "./layout";
import type { CategoryId, DieValue, GameView } from "./types";

export type CameraSettings = {
  fov: number;
  elevation: number;
  distance: number;
};
export const DEFAULT_CAMERA: CameraSettings = {
  fov: 22,
  elevation: 45,
  distance: 1,
};
type Motion = {
  object: THREE.Object3D;
  from: THREE.Vector3;
  to: THREE.Vector3;
  fromQ: THREE.Quaternion;
  toQ: THREE.Quaternion;
  start: number;
  duration: number;
  roll: boolean;
  seed: number;
  contact?: () => void;
};
const faceNormals = [
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(0, -1, 0),
];
export class DungeonScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.PerspectiveCamera(22, 1, 0.1, 500);
  readonly controls: OrbitControls;
  private world = new THREE.Scene();
  private models = new Map<string, THREE.Group>();
  private dice: THREE.Group[] = [];
  private markers = new Map<CategoryId, THREE.Group>();
  private chips: THREE.Group[] = [];
  private rings: THREE.Mesh[] = [];
  private legalRings = new Map<CategoryId, THREE.Mesh>();
  private pawn?: THREE.Group;
  private motions: Motion[] = [];
  private queued = false;
  private disposed = false;
  private observer: ResizeObserver;
  private onComplete?: () => void;
  private ray = new THREE.Raycaster();
  private hitObjects: THREE.Mesh[] = [];
  private pointers = new Map<number, { x: number; y: number; drag: boolean }>();
  private homeDistance = 40;
  private settings: CameraSettings = { ...DEFAULT_CAMERA };
  private draws = 0;
  private loaded = false;
  private overlay?: () => void;
  onTap: (id: string) => void = () => {};
  onContact: (kind: "die" | "place" | "skill", x: number) => void = () => {};
  onError: (message: string) => void = () => {};
  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor("#4e473b");
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    const canvas = this.renderer.domElement;
    canvas.setAttribute(
      "aria-label",
      "ダンジョンの卓上。ドラッグで移動、ピンチで拡大。",
    );
    host.prepend(canvas);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableRotate = false;
    this.controls.enableDamping = false;
    this.controls.screenSpacePanning = true;
    this.controls.zoomSpeed = 0.75;
    this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    this.controls.touches.ONE = THREE.TOUCH.PAN;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    this.controls.addEventListener("change", () => this.draw());
    this.world.add(new THREE.HemisphereLight("#fff7ed", "#736c59", 1.8));
    const sun = new THREE.DirectionalLight("#fff4e2", 2.3);
    sun.position.set(-8, 19, 8);
    sun.castShadow = true;
    Object.assign(sun.shadow.camera, {
      left: -16,
      right: 16,
      top: 16,
      bottom: -16,
      near: 1,
      far: 50,
    });
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 3;
    sun.shadow.normalBias = 0.022;
    sun.shadow.bias = -0.0001;
    this.world.add(sun);
    const fill = new THREE.DirectionalLight("#e0ddd1", 0.6);
    fill.position.set(10, 9, -7);
    this.world.add(fill);
    canvas.addEventListener("pointerdown", (e) => {
      this.pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        drag: false,
      });
      if (this.pointers.size > 1)
        for (const p of this.pointers.values()) p.drag = true;
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = this.pointers.get(e.pointerId);
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 7) p.drag = true;
    });
    canvas.addEventListener("pointerup", (e) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (!p || p.drag || e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      this.ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((e.clientY - rect.top) / rect.height) * 2,
        ),
        this.camera,
      );
      this.world.updateMatrixWorld(true);
      const hit = this.ray
        .intersectObjects(this.hitObjects, false)
        .find((h) => h.object.visible);
      this.onTap(hit?.object.userData.id ?? "empty");
    });
    for (const type of ["pointercancel", "lostpointercapture"])
      canvas.addEventListener(type, (e) =>
        this.pointers.delete((e as PointerEvent).pointerId),
      );
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.finish();
      this.onError("描画を再接続しています…");
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.onError("");
      this.invalidate();
    });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  private material(color: string, roughness = 0.86) {
    return new THREE.MeshStandardMaterial({ color, roughness });
  }
  private box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    this.world.add(mesh);
    return mesh;
  }
  private hit(
    id: string,
    w: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.16, d),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.position.set(x, y, z);
    hit.userData.id = id;
    this.world.add(hit);
    this.hitObjects.push(hit);
    return hit;
  }
  private async texture(name: string) {
    const t = await new THREE.TextureLoader().loadAsync(
      assetUrl(`print/${name}.png`),
    );
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  private async board(
    name: string,
    w: number,
    d: number,
    x: number,
    z: number,
    h = 0.12,
  ) {
    this.box(w, h, d, x, h / 2, z, this.material("#a58a60"));
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({
        map: await this.texture(name),
        roughness: 0.96,
      }),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.set(x, h + 0.003, z);
    top.receiveShadow = true;
    this.world.add(top);
  }
  private clone(name: string, color?: string) {
    const group = this.models.get(name)!.clone(true);
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = object.receiveShadow = true;
        const change = (m: THREE.Material) => {
          const c = m.clone();
          if (
            color &&
            c.name === "Paint" &&
            c instanceof THREE.MeshStandardMaterial
          )
            c.color.set(color);
          return c;
        };
        object.material = Array.isArray(object.material)
          ? object.material.map(change)
          : change(object.material);
      }
    });
    this.world.add(group);
    return group;
  }
  async load() {
    const loader = new GLTFLoader();
    await Promise.all(
      ["die", "adventurer", "marker", "skill"].map(async (n) =>
        this.models.set(
          n,
          (await loader.loadAsync(assetUrl(`toys/${n}.glb`))).scene,
        ),
      ),
    );
    const wood = await this.texture("table");
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(5, 5);
    this.box(
      180,
      0.22,
      180,
      0,
      -0.12,
      0,
      new THREE.MeshStandardMaterial({
        map: wood,
        color: "#8e897d",
        roughness: 0.88,
      }),
    );
    await this.board("board", 15.4, 4.56, 0, -5.9, 0.18);
    await Promise.all(
      GROUPS.map((g, i) => this.board(g, 4.8, 5.2, -5.2 + i * 5.2, 0.31)),
    );
    const rail = this.material("#694d34", 0.7);
    this.box(
      TRAY.width,
      0.18,
      TRAY.depth,
      0,
      0.09,
      TRAY.z,
      this.material("#535c43", 1),
    );
    for (const sign of [-1, 1]) {
      this.box(
        TRAY.width + 0.35,
        0.36,
        0.18,
        0,
        0.18,
        TRAY.z + (sign * (TRAY.depth + 0.18)) / 2,
        rail,
      );
      this.box(
        0.18,
        0.36,
        TRAY.depth,
        (-sign * (TRAY.width + 0.18)) / 2,
        0.18,
        TRAY.z,
        rail,
      );
    }
    for (let i = 0; i < 5; i++) {
      const pivot = new THREE.Group();
      const model = this.clone("die");
      model.position.y = -0.4;
      pivot.add(model);
      this.world.add(pivot);
      pivot.position.set(-4.6 + i * 2.3, 0.58, 5);
      this.dice.push(pivot);
      this.hit(
        `die:${i}`,
        1.25,
        1.25,
        pivot.position.x,
        0.66,
        pivot.position.z,
      );
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.56, 0.61, 32),
        new THREE.MeshBasicMaterial({
          color: "#ddbc76",
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pivot.position.x, 0.19, pivot.position.z);
      ring.visible = false;
      this.world.add(ring);
      this.rings.push(ring);
    }
    for (const s of slots) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(
          s.group === "dungeon" ? 0.27 : 0.2,
          s.group === "dungeon" ? 0.34 : 0.27,
          40,
        ),
        new THREE.MeshBasicMaterial({
          color: "#a56824",
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(
        s.x - (s.group === "dungeon" ? 0 : 1.68),
        s.group === "dungeon" ? 0.187 : 0.127,
        s.z,
      );
      ring.visible = false;
      this.world.add(ring);
      this.legalRings.set(s.id, ring);
      const marker = this.clone("marker", COLORS[s.group]);
      marker.position.set(
        s.x - (s.group === "dungeon" ? 0 : 1.68),
        s.group === "dungeon" ? 0.19 : 0.13,
        s.z,
      );
      marker.visible = false;
      this.markers.set(s.id, marker);
      this.hit(
        `category:${s.id}`,
        s.group === "dungeon" ? 2.4 : 4.5,
        s.group === "dungeon" ? 2.0 : 0.75,
        s.x,
        0.25,
        s.z - (s.group === "dungeon" ? 0.6 : 0),
      );
    }
    this.pawn = this.clone("adventurer");
    this.pawn.position.set(-6.8, 0.19, -7.4);
    GROUPS.forEach((_, i) => {
      const chip = this.clone("skill");
      chip.position.set(-6.8 + i * 5.2, 0.13, SKILL_Z - 0.18);
      chip.scale.setScalar(1.5);
      this.chips.push(chip);
      this.hit(`skill:${i}`, 3.8, 0.7, -5.2 + i * 5.2, 0.27, SKILL_Z);
    });
    this.loaded = true;
    this.invalidate();
  }
  setOverlay(fn: () => void) {
    this.overlay = fn;
  }
  project(x: number, y: number, z: number) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return {
      x: ((v.x + 1) * this.host.clientWidth) / 2,
      y: ((1 - v.y) * this.host.clientHeight) / 2,
      visible: v.z > -1 && v.z < 1,
    };
  }
  diePosition(i: number) {
    return this.dice[i]?.position.clone() ?? new THREE.Vector3();
  }
  private face(value: number, yaw = 0) {
    return new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      .multiply(
        new THREE.Quaternion().setFromUnitVectors(
          faceNormals[value - 1],
          new THREE.Vector3(0, 1, 0),
        ),
      );
  }
  private move(
    object: THREE.Object3D,
    to: THREE.Vector3,
    duration: number,
    toQ = object.quaternion.clone(),
    roll = false,
    seed = 0,
    contact?: () => void,
  ) {
    this.motions.push({
      object,
      from: object.position.clone(),
      to,
      fromQ: object.quaternion.clone(),
      toQ,
      start: performance.now(),
      duration,
      roll,
      seed,
      contact,
    });
    this.draw();
  }
  sync(view: GameView, held: Set<number>) {
    this.finish(false);
    view.dice.forEach((v, i) => {
      if (
        faceNormals[v - 1].clone().applyQuaternion(this.dice[i].quaternion).y <
        0.999
      )
        this.dice[i].quaternion.copy(this.face(v));
    });
    this.dice.forEach((d, i) => {
      d.visible = true;
      this.rings[i].visible = held.has(i) && view.dice.length > 0;
      this.rings[i].position.x = d.position.x;
      this.rings[i].position.z = d.position.z;
    });
    for (const s of view.categories) {
      this.markers.get(s.id)!.visible = s.isChecked;
      this.legalRings.get(s.id)!.visible = s.isSelectable;
    }
    GROUPS.forEach((g, i) => {
      const status = view.skills[SKILLS[g]].status;
      this.chips[i].rotation.x = status === "available" ? 0 : Math.PI;
      this.chips[i].position.y = status === "available" ? 0.13 : 0.41;
    });
    const floors = view.categories.filter(
      (s) => s.group === "dungeon" && s.isChecked,
    ).length;
    this.pawn!.position.set(floors ? slots[floors - 1].x : -6.8, 0.19, -7.35);
    this.refreshHits();
    this.invalidate();
  }
  roll(values: DieValue[], indices: number[], done: () => void) {
    this.finish(false);
    this.onComplete = done;
    for (const ring of this.legalRings.values()) ring.visible = false;
    for (const i of indices) {
      const yaw = (Math.random() - 0.5) * 1.5;
      const to = new THREE.Vector3(
        -4.6 + i * 2.3 + (Math.random() - 0.5) * 0.52,
        0.58,
        TRAY.z + (Math.random() - 0.5) * 1.35,
      );
      this.rings[i].visible = false;
      this.move(
        this.dice[i],
        to,
        1200,
        this.face(values[i], yaw),
        true,
        i,
        () => this.onContact("die", to.x),
      );
    }
    if (!indices.length) {
      this.onComplete = undefined;
      done();
    }
  }
  skill(i: number, value: DieValue, groupIndex: number, done: () => void) {
    this.finish(false);
    this.onComplete = done;
    for (const ring of this.legalRings.values()) ring.visible = false;
    this.move(
      this.dice[i],
      this.dice[i].position.clone(),
      380,
      this.face(value),
    );
    const chip = this.chips[groupIndex];
    const to = chip.position.clone();
    to.y = 0.41;
    this.move(
      chip,
      to,
      380,
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)),
      false,
      0,
      () => this.onContact("skill", chip.position.x),
    );
  }
  place(id: CategoryId, next: GameView, done: () => void) {
    this.finish(false);
    this.onComplete = done;
    for (const ring of this.legalRings.values()) ring.visible = false;
    const marker = this.markers.get(id)!;
    const to = marker.position.clone();
    marker.visible = true;
    marker.position.y += 0.65;
    this.move(marker, to, 300, marker.quaternion.clone(), false, 0, () =>
      this.onContact("place", to.x),
    );
    GROUPS.forEach((g, i) => {
      if (
        next.skills[SKILLS[g]].status === "available" &&
        this.chips[i].rotation.x > 1
      ) {
        const chip = this.chips[i];
        const to = chip.position.clone();
        to.y = 0.13;
        this.move(chip, to, 420, new THREE.Quaternion());
      }
    });
    if (id.startsWith("dungeon")) {
      const target = slots.find((s) => s.id === id)!;
      this.move(this.pawn!, new THREE.Vector3(target.x, 0.19, -7.35), 420);
    }
  }
  finish(notify = true) {
    for (const m of this.motions) {
      m.object.position.copy(m.to);
      m.object.quaternion.copy(m.toQ);
    }
    this.motions = [];
    const done = this.onComplete;
    this.onComplete = undefined;
    this.refreshHits();
    this.invalidate();
    if (notify) done?.();
  }
  private refreshHits() {
    this.dice.forEach((d, i) => {
      const h = this.hitObjects.find((o) => o.userData.id === `die:${i}`);
      if (h) h.position.copy(d.position);
    });
  }
  private animate(now: number) {
    const remaining: Motion[] = [];
    for (const m of this.motions) {
      const p = Math.min(1, (now - m.start) / m.duration);
      const ease = 1 - Math.pow(1 - p, 3);
      m.object.position.lerpVectors(m.from, m.to, ease);
      m.object.quaternion.slerpQuaternions(m.fromQ, m.toQ, ease);
      if (m.roll) {
        m.object.position.y +=
          Math.abs(Math.sin(p * Math.PI * 3)) * Math.pow(1 - p, 1.8) * 1.3;
        m.object.position.z +=
          Math.sin(p * Math.PI * 2 + m.seed) * Math.sin(p * Math.PI) * 0.35;
        const angle = Math.pow(1 - p, 2) * Math.PI * 6;
        m.object.quaternion
          .copy(m.toQ)
          .multiply(
            new THREE.Quaternion().setFromEuler(
              new THREE.Euler(angle, angle * 0.7, angle * 0.4),
            ),
          );
      } else m.object.position.y += Math.sin(p * Math.PI) * 0.28;
      if (p < 1) remaining.push(m);
      else {
        m.object.position.copy(m.to);
        m.object.quaternion.copy(m.toQ);
        m.contact?.();
      }
    }
    this.motions = remaining;
    this.refreshHits();
    if (!remaining.length && this.onComplete) {
      const done = this.onComplete;
      this.onComplete = undefined;
      done();
    }
  }
  draw() {
    if (this.queued || this.disposed) return;
    this.queued = true;
    requestAnimationFrame((now) => {
      this.queued = false;
      if (this.motions.length) {
        this.animate(now);
        this.renderer.shadowMap.needsUpdate = true;
      }
      this.overlay?.();
      if (!this.loaded) this.renderer.shadowMap.needsUpdate = true;
      this.renderer.render(this.world, this.camera);
      this.draws++;
      if (this.motions.length) this.draw();
    });
  }
  private invalidate() {
    this.renderer.shadowMap.needsUpdate = true;
    this.draw();
  }
  private resize() {
    const { clientWidth: w, clientHeight: h } = this.host;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.home();
  }
  configure(value: CameraSettings) {
    this.settings = {
      fov: Math.max(10, Math.min(45, value.fov)),
      elevation: Math.max(25, Math.min(75, value.elevation)),
      distance: Math.max(0.6, Math.min(1.8, value.distance)),
    };
    this.home();
  }
  home() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.camera.fov = this.settings.fov;
    this.homeDistance =
      (Math.max(15.6, 18.2 / Math.max(0.35, w / h)) /
        (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))) *
      this.settings.distance;
    const pitch = THREE.MathUtils.degToRad(this.settings.elevation);
    this.controls.target.set(0, 0, -0.4);
    this.camera.position.set(
      0,
      Math.sin(pitch) * this.homeDistance,
      -0.4 + Math.cos(pitch) * this.homeDistance,
    );
    this.controls.minDistance = this.homeDistance / 3;
    this.controls.maxDistance = this.homeDistance * 1.6;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.draw();
  }
  zoom(factor: number) {
    const offset = this.camera.position
      .clone()
      .sub(this.controls.target)
      .multiplyScalar(factor);
    offset.setLength(
      Math.max(
        this.controls.minDistance,
        Math.min(this.controls.maxDistance, offset.length()),
      ),
    );
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.draw();
  }
  diagnostics() {
    return {
      draws: this.draws,
      triangles: this.renderer.info.render.triangles,
      calls: this.renderer.info.render.calls,
      motions: this.motions.length,
      camera: this.camera.position.toArray(),
      quaternion: this.camera.quaternion.toArray(),
      dice: this.dice.map((d) => ({
        position: d.position.toArray(),
        top:
          faceNormals
            .map((n) => n.clone().applyQuaternion(d.quaternion).y)
            .indexOf(
              Math.max(
                ...faceNormals.map(
                  (n) => n.clone().applyQuaternion(d.quaternion).y,
                ),
              ),
            ) + 1,
      })),
    };
  }
}

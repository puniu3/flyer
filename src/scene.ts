import { printBoard } from "./board-print";
import { fontFamily } from "./localization";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { surfaceGrain, softMask } from "./table-finish";
import { TableEffects } from "./table-effects";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  slots,
  GROUPS,
  COLORS,
  SKILL_Z,
  SKILL_CARD,
  SKILLS,
  assetUrl,
  abilityX,
  markerX,
  makeLayout,
  SHEET_HEIGHT,
  SHEET_TOP,
} from "./layout";
import type { CategoryId, DieValue, GameView, SkillId } from "./types";

export type CameraSettings = {
  fov: number;
  elevation: number;
  distance: number;
};
export const DEFAULT_CAMERA: CameraSettings = {
  fov: 22,
  elevation: 68,
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
  readonly layout = makeLayout();
  readonly camera = new THREE.PerspectiveCamera(22, 1, 1, 500);
  readonly controls: OrbitControls;
  private world = new THREE.Scene();
  private effects = new TableEffects(this.world);
  private paperGrain = surfaceGrain("paper");
  private feltGrain = surfaceGrain("felt");
  private paperEdge = surfaceGrain("edge");
  private woodGrain = surfaceGrain("wood");
  private cardShadow = softMask(true);
  private models = new Map<string, THREE.Group>();
  private dice: THREE.Group[] = [];
  private markers = new Map<CategoryId, THREE.Group>();
  private chips: THREE.Group[] = [];
  private chipProgress: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshStandardMaterial
  >[] = [];
  private progressTextures: THREE.CanvasTexture[] = [];
  private skillCards: { object: THREE.Group; texture: THREE.CanvasTexture; key: string }[] = [];
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
  private locale = "ja";
  private boardPrints: { name: string; base: HTMLImageElement; texture: THREE.CanvasTexture }[] = [];
  setLocale(locale: string) {
    this.locale = locale;
    for (const board of this.boardPrints) {
      printBoard(board.texture.image, board.base, board.name, locale);
      board.texture.needsUpdate = true;
    }
    for (const card of this.skillCards) card.key = "";
    this.invalidate();
  }
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
    this.world.add(new THREE.HemisphereLight("#fffaf3", "#696b62", 1.65));
    const sun = new THREE.DirectionalLight("#fffaf3", 2.1);
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
    sun.shadow.normalBias = 0.009;
    sun.shadow.bias = -0.00005;
    this.world.add(sun);
    const fill = new THREE.DirectionalLight("#efeee7", 0.7);
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
      this.clearEffects();
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
    bevel = 0,
  ) {
    const geometry = bevel ? new RoundedBoxGeometry(w, h, d, 2, bevel) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
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
    h = SHEET_HEIGHT,
  ) {
    const group = new THREE.Group();
    group.add(this.box(w, h, d, x, h / 2, z, new THREE.MeshStandardMaterial({ color: "#b8a485", map: this.paperEdge, roughness: 0.98 })));
    const baseTexture = await this.texture(name);
    const base = baseTexture.image as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * 100);
    canvas.height = Math.round(d * 100);
    printBoard(canvas, base, name, this.locale);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.boardPrints.push({ name, base, texture });
    baseTexture.dispose();
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.98,
        bumpMap: this.paperGrain,
        bumpScale: 0.005,
      }),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.set(x, h + 0.003, z);
    top.receiveShadow = true;
    group.add(top);
    return group;
  }
  private clone(name: string, color?: string) {
    const group = this.models.get(name)!.clone(true);
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = object.receiveShadow = true;
        const change = (m: THREE.Material) => {
          const c = m.clone();
          if (c instanceof THREE.MeshStandardMaterial) {
            if (c.name === "Maple") c.roughness = 0.5;
            if (c.name === "Paint" || c.name === "Ochre") c.roughness = 0.55;
          }
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
  private progressTexture(count: number) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#75502c";
    context.font = "76px Georgia, serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${count}/3`, 128, 67);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    return texture;
  }
  selectSkill(id: SkillId | null) {
    const index = GROUPS.findIndex((g) => SKILLS[g] === id);
    this.effects.select(index >= 0 ? this.chips[index]?.position ?? null : null,
      this.dice.map((die) => die.position), SHEET_TOP + 0.005);
    this.draw();
  }
  clearEffects() {
    this.effects.clear();
    this.draw();
  }
  setSkillCard(index: number, title: string, description: string, status: string, active: boolean) {
    const card = this.skillCards[index];
    if (!card) return;
    const key = JSON.stringify([title, description, status, active]);
    if (card.key === key) return;
    card.key = key;
    card.object.visible = status !== "locked";
    if (card.object.visible) {
      const canvas = card.texture.image as HTMLCanvasElement;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#eee3cd";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = active ? "#986127" : "#b5a182";
      context.lineWidth = active ? 5 : 2;
      context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
      context.fillStyle = status === "used" ? "#89775b" : "#342a1e";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `48px ${fontFamily(this.locale)}`;
      context.fillText(title, canvas.width / 2, 61);
      context.font = `36px ${fontFamily(this.locale)}`;
      const words = description.match(/[\p{Script=Latin}\p{N}]+|\s+|./gu) ?? [];
      const lines: string[] = [];
      let line = "";
      for (const segment of words) {
        if (context.measureText(line + segment).width > canvas.width - 52 && line) {
          lines.push(line.trim());
          line = segment.trimStart();
        } else line += segment;
      }
      if (line) lines.push(line.trim());
      const firstY = 164 - ((lines.length - 1) * 43) / 2;
      lines.forEach((text, i) => context.fillText(text, canvas.width / 2, firstY + i * 43));
      card.texture.needsUpdate = true;
    }
    this.invalidate();
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
    {
      const layout = this.layout;
      const group = new THREE.Group();
      const d = layout.dungeon;
      group.add(await this.board("board", d.width, d.depth, d.x, d.z));
      for (const [i, name] of GROUPS.entries()) {
        const b = layout.abilities[i];
        group.add(await this.board(name, b.width, b.depth, b.x, b.z));
      }
      const tray = layout.tray;
      const rail = new THREE.MeshStandardMaterial({ color: "#795737", map: this.woodGrain, roughness: 0.5 });
      const felt = new THREE.MeshStandardMaterial({ color: "#566044", map: this.feltGrain, bumpMap: this.feltGrain, bumpScale: 0.008, roughness: 1 });
      group.add(this.box(tray.width, 0.18, tray.depth, tray.x, 0.09, tray.z, felt));
      for (const sign of [-1, 1]) {
        group.add(this.box(tray.width + 2 * tray.railWidth, tray.railHeight, tray.railWidth,
          tray.x, tray.railHeight / 2, tray.z + sign * (tray.depth + tray.railWidth) / 2, rail, 0.035));
        group.add(this.box(tray.railWidth, tray.railHeight, tray.depth,
          tray.x + sign * (tray.width + tray.railWidth) / 2, tray.railHeight / 2, tray.z, rail, 0.035));
      }
      const brass = new THREE.MeshStandardMaterial({ color: "#b39860", metalness: 0.65, roughness: 0.36 });
      for (const sign of [-1, 1]) {
        group.add(this.box(tray.width, 0.009, 0.026, tray.x, tray.railHeight + 0.001,
          tray.z + sign * (tray.depth + tray.railWidth) / 2, brass));
        group.add(this.box(0.026, 0.009, tray.depth, tray.x + sign * (tray.width + tray.railWidth) / 2,
          tray.railHeight + 0.001, tray.z, brass));
        for (const side of [-1, 1]) {
          const x = tray.x + side * (tray.width + tray.railWidth) / 2;
          const z = tray.z + sign * (tray.depth + tray.railWidth) / 2;
          group.add(this.box(0.5, 0.016, 0.13, x - side * 0.18, tray.railHeight + 0.004, z, brass, 0.012));
          group.add(this.box(0.13, 0.016, 0.5, x, tray.railHeight + 0.004, z - sign * 0.18, brass, 0.012));
        }
      }
      this.world.add(group);
    }
    for (let i = 0; i < 5; i++) {
      const pivot = new THREE.Group();
      const model = this.clone("die");
      model.position.y = -0.4;
      pivot.add(model);
      this.world.add(pivot);
      pivot.position.set(this.layout.tray.x + (i - 2) * this.layout.dieSpacing, 0.58, this.layout.tray.z);
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
          s.group === "dungeon" ? 0.252 : 0.2,
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
        markerX(s),
        SHEET_TOP + 0.004,
        s.z,
      );
      ring.visible = false;
      this.world.add(ring);
      this.legalRings.set(s.id, ring);
      const marker = this.clone("marker", COLORS[s.group]);
      marker.position.set(
        markerX(s),
        SHEET_TOP + 0.007,
        s.z,
      );
      marker.visible = false;
      this.markers.set(s.id, marker);
      this.hit(
        `category:${s.id}`,
        s.group === "dungeon" ? 3.9 : 4.5,
        s.group === "dungeon" ? 1.5 : 0.85,
        s.x,
        0.25,
        s.z,
      );
    }
    this.pawn = this.clone("adventurer");
    this.pawn.position.set(this.layout.pawnX, SHEET_TOP + 0.007, this.layout.pawnStartZ);
    this.progressTextures = [0, 1, 2].map((count) =>
      this.progressTexture(count),
    );
    GROUPS.forEach((_, i) => {
      const chip = this.clone("skill");
      chip.position.set(abilityX(i) - 1.4, SHEET_TOP + 0.007, SKILL_Z);
      chip.scale.setScalar(1.5);
      const progress = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.42),
        new THREE.MeshStandardMaterial({
          map: this.progressTextures[0],
          transparent: true,
          depthWrite: false,
          roughness: 0.95,
        }),
      );
      progress.rotation.x = Math.PI / 2;
      progress.position.y = -0.003;
      chip.add(progress);
      this.chipProgress.push(progress);
      this.chips.push(chip);
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 256;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      const card = new THREE.Group();
      card.position.set(abilityX(i) + SKILL_CARD.offsetX, SHEET_TOP + 0.007, SKILL_Z);
      const stock = new THREE.Mesh(
        new THREE.BoxGeometry(SKILL_CARD.width, 0.045, SKILL_CARD.depth),
        this.material("#d4c5aa", 0.98),
      );
      stock.position.y = 0.0225;
      stock.castShadow = stock.receiveShadow = true;
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(SKILL_CARD.width, SKILL_CARD.depth),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.96 }),
      );
      face.rotation.x = -Math.PI / 2;
      face.position.y = SKILL_CARD.top - card.position.y;
      face.receiveShadow = true;
      const contact = new THREE.Mesh(
        new THREE.PlaneGeometry(SKILL_CARD.width + 0.18, SKILL_CARD.depth + 0.12),
        new THREE.MeshBasicMaterial({ map: this.cardShadow, color: "#413425", transparent: true, opacity: 0.15, depthWrite: false }),
      );
      contact.rotation.x = -Math.PI / 2;
      contact.position.set(0.025, -0.004, 0.025);
      card.add(contact, stock, face);
      card.visible = false;
      this.world.add(card);
      this.skillCards.push({ object: card, texture, key: "" });
      this.hit(`skill:${i}`, 4.1, 1.0, abilityX(i), 0.27, SKILL_Z);
    });
    this.loaded = true;
    this.applyLayout();
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
      this.rings[i].visible =
        held.has(i) && view.dice.length > 0 && view.rolls.canRoll;
      this.rings[i].position.x = d.position.x;
      this.rings[i].position.z = d.position.z;
    });
    for (const s of view.categories) {
      this.markers.get(s.id)!.visible = s.isChecked;
      this.legalRings.get(s.id)!.visible = s.isSelectable;
    }
    GROUPS.forEach((g, i) => {
      const status = view.skills[SKILLS[g]].status;
      const count = view.categories.filter(
        (category) => category.group === g && category.isChecked,
      ).length;
      this.chipProgress[i].visible = status === "locked";
      this.chipProgress[i].material.map =
        this.progressTextures[Math.min(2, count)];
      this.chips[i].rotation.x = status === "available" ? 0 : Math.PI;
      this.chips[i].position.y = status === "available" ? SHEET_TOP + 0.007 : SHEET_TOP + 0.287;
    });
    const floors = view.categories.filter(
      (s) => s.group === "dungeon" && s.isChecked,
    ).length;
    this.pawn!.position.set(this.layout.pawnX, SHEET_TOP + 0.007, floors ? this.layout.slots[floors - 1].z : this.layout.pawnStartZ);
    this.refreshHits();
    this.invalidate();
  }
  roll(
    values: DieValue[],
    indices: number[],
    canKeep: boolean,
    done: () => void,
  ) {
    this.finish(false);
    this.onComplete = done;
    for (const ring of this.legalRings.values()) ring.visible = false;
    if (!canKeep) for (const ring of this.rings) ring.visible = false;
    for (const i of indices) {
      const yaw = (Math.random() - 0.5) * 1.5;
      const to = new THREE.Vector3(
        this.layout.tray.x + (i - 2) * this.layout.dieSpacing + (Math.random() - 0.5) * 0.4,
        0.58,
        this.layout.tray.z + (Math.random() - 0.5) * 0.9,
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
    to.y = SHEET_TOP + 0.287;
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
        to.y = SHEET_TOP + 0.007;
        const unlocking = this.chipProgress[i].visible;
        this.move(chip, to, 420, new THREE.Quaternion(), false, 0, () => {
          if (unlocking) this.effects.burst(to, 6, 650);
        });
      }
    });
    if (id.startsWith("dungeon")) {
      const target = this.layout.slots.find((s) => s.id === id)!;
      const destination = new THREE.Vector3(this.layout.pawnX, SHEET_TOP + 0.007, target.z);
      this.move(this.pawn!, destination, 420, this.pawn!.quaternion.clone(), false, 0, () => {
        if (id === "dungeon_floor_5") this.effects.burst(destination, 10, 900);
      });
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
      const effectChanging = this.effects.update(now);
      this.overlay?.();
      if (!this.loaded) this.renderer.shadowMap.needsUpdate = true;
      this.renderer.render(this.world, this.camera);
      this.draws++;
      if (this.motions.length || effectChanging) this.draw();
    });
  }
  private invalidate() {
    this.renderer.shadowMap.needsUpdate = true;
    this.draw();
  }
  private applyLayout() {
    const layout = this.layout;
    for (const s of layout.slots) {
      this.markers.get(s.id)!.position.set(markerX(s), SHEET_TOP + 0.007, s.z);
      this.legalRings.get(s.id)!.position.set(markerX(s), SHEET_TOP + 0.004, s.z);
      const hit = this.hitObjects.find((h) => h.userData.id === `category:${s.id}`)!;
      hit.geometry.dispose();
      hit.geometry = new THREE.BoxGeometry(s.hitWidth, 0.16, s.hitDepth);
      hit.position.set(s.x, SHEET_TOP + 0.05, s.z);
    }
    layout.skillPositions.forEach((p, i) => {
      this.chips[i].position.x = p.x - 1.4;
      this.chips[i].position.z = p.z;
      this.skillCards[i].object.position.set(p.x + SKILL_CARD.offsetX, SHEET_TOP + 0.007, p.z);
      this.hitObjects.find((h) => h.userData.id === `skill:${i}`)!.position.set(p.x, SHEET_TOP + 0.15, p.z);
    });
    this.dice.forEach((die, i) => {
      die.position.set(layout.tray.x + (i - 2) * layout.dieSpacing, 0.58, layout.tray.z);
      this.rings[i].position.set(die.position.x, 0.19, die.position.z);
    });
    this.pawn!.position.set(layout.pawnX, SHEET_TOP + 0.007, layout.pawnStartZ);
    this.refreshHits();
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
      (Math.max(12.0, (this.layout.right - this.layout.left + 2.2) / Math.max(0.35, w / h)) /
        (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))) *
      this.settings.distance;
    const pitch = THREE.MathUtils.degToRad(this.settings.elevation);
    const centerX = (this.layout.left + this.layout.right) / 2;
    const centerZ = (this.layout.top + this.layout.bottom) / 2;
    this.controls.target.set(centerX, 0, centerZ);
    this.camera.position.set(
      centerX,
      Math.sin(pitch) * this.homeDistance,
      centerZ + Math.cos(pitch) * this.homeDistance,
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
      layout: "landscape",
      effects: this.effects.diagnostics(),
      keepRings: this.rings.map((ring) => ring.visible),
      skillCards: this.skillCards.map((card) => ({ visible: card.object.visible, scale: card.object.scale.toArray() })),
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

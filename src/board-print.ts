import { makeLayout, GROUPS } from "./layout";
import { translator, fontFamily } from "./localization";
export function printBoard(canvas: HTMLCanvasElement, base: CanvasImageSource, name: string, locale: string) {
  const c = canvas.getContext("2d")!;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.drawImage(base, 0, 0, canvas.width, canvas.height);
  const t = translator(locale);
  const layout = makeLayout();
  const dungeon = name === "board";
  const group = dungeon ? "dungeon" : name;
  const board = dungeon ? layout.dungeon : layout.abilities[GROUPS.indexOf(name as typeof GROUPS[number])];
  const label = (x: number, y: number, value: string, size: number, width: number, color: string) => {
    c.font = `${size}px ${/^[≥≤\d]/u.test(value) ? "Georgia, serif" : fontFamily(locale)}`;
    c.fillStyle = color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    const segments = value.includes(" ") ? value.split(" ") : [...value];
    const join = value.includes(" ") ? " " : "";
    const lines: string[] = [];
    let line = "";
    for (const part of segments) {
      const next = line ? line + join + part : part;
      if (c.measureText(next).width > width && line) { lines.push(line); line = part; }
      else line = next;
    }
    if (line) lines.push(line);
    lines.forEach((line, i) => c.fillText(line, x, y + (i - (lines.length - 1) / 2) * size * 1.12));
  };
  label(dungeon ? 210 : 267, 71, t(`board_${group}`), 29, dungeon ? 345 : 285, "#fff0cf");
  for (const slot of layout.slots.filter(s => s.group === group)) {
    const y = (slot.z - board.z + board.depth / 2) * 100;
    const numeric = /^[≥≤\d]/u.test(slot.mark);
    let role = numeric ? slot.mark : dungeon ? t("five_kind") : t(`cat_${slot.id}`);
    if (locale === "en") role = role.toUpperCase();
    label(dungeon ? 260 : 262, y, role, 32, dungeon ? 240 : 315, "#30291f");
  }
}

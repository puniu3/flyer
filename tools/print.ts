import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
process.env.FONTCONFIG_FILE = fileURLToPath(
  new URL("./fonts.conf", import.meta.url),
);
import sharp from "sharp";
import { makeLayout, markerX, GROUPS, COLORS } from "../src/layout";
const out = "public/assets/print";
await fs.mkdir(out, { recursive: true });
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const text = (
  x: number,
  y: number,
  s: string,
  size = 20,
  color = "#30291f",
  extra = "",
) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia, serif" font-size="${size}" fill="${color}" ${extra}>${esc(s)}</text>`;
const wrap = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#e1d6bd"/><rect x="12" y="12" width="${w - 24}" height="${h - 24}" fill="none" stroke="#9b8a70" stroke-width="1.2"/>${body}</svg>`;
const roleSize = 32;
const headingSize = 29;
for (const portrait of [false, true]) {
  const layout = makeLayout(portrait);
  const suffix = portrait ? "-portrait" : "";
  const d = layout.dungeon;
  const dw = Math.round(d.width * 100), dh = Math.round(d.depth * 100);
  let body = text(268, 65, "DUNGEON", headingSize);
  layout.slots.filter((s) => s.group === "dungeon").forEach((s, i, floors) => {
    const y = (s.z - d.z + d.depth / 2) * 100;
    if (i > 0) {
      const line = ((s.z + floors[i - 1].z) / 2 - d.z + d.depth / 2) * 100;
      body += `<path d="M30 ${line}H${dw - 30}" stroke="#b7a88d" stroke-width="1"/>`;
    }
    body += text(90, y - 27, s.label, 18, "#76664f");
    body += `<circle cx="90" cy="${y}" r="24" fill="none" stroke="#b7a88d" stroke-width="1"/>`;
    if (i < 4) body += text(260, y + 10, s.mark, roleSize);
    else body += text(260, y - 6, "FIVE OF", roleSize) + text(260, y + 31, "A KIND", roleSize);
  });
  const dungeonSvg = wrap(dw, dh, body);
  await fs.writeFile(`art/board${suffix}.svg`, dungeonSvg);
  await sharp(Buffer.from(dungeonSvg)).png().toFile(`${out}/board${suffix}.png`);
  for (const [g, group] of GROUPS.entries()) {
    const board = layout.abilities[g];
    const w = Math.round(board.width * 100), h = Math.round(board.depth * 100);
    let b = `<rect x="12" y="12" width="${w - 24}" height="7" fill="${COLORS[group]}"/>`;
    b += text(w / 2, 72, ["Strength", "Dexterity", "Intellect"][g], headingSize, COLORS[group]);
    layout.slots.filter((s) => s.group === group).forEach((s) => {
      const x = (s.x - board.x + board.width / 2) * 100;
      const y = (s.z - board.z + board.depth / 2) * 100;
      const mark = (markerX(s) - board.x + board.width / 2) * 100;
      b += `<path d="M${x - 195} ${y + 50}H${x + 195}" stroke="#b7a88d" stroke-width="1"/><circle cx="${mark}" cy="${y}" r="20" fill="none" stroke="${COLORS[group]}" stroke-width="1.2"/>`;
      b += text(x + 37, y + 10, s.mark, roleSize);
    });
    const svg = wrap(w, h, b);
    await fs.writeFile(`art/${group}${suffix}.svg`, svg);
    await sharp(Buffer.from(svg)).png().toFile(`${out}/${group}${suffix}.png`);
  }
}
const wood = await sharp("art/textures/maple.png")
  .modulate({ saturation: 0, brightness: 0.7 })
  .png()
  .toBuffer();
await fs.writeFile(`${out}/table.png`, wood);
console.log("Printed board and three ability boards");

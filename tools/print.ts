import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
process.env.FONTCONFIG_FILE = fileURLToPath(
  new URL("./fonts.conf", import.meta.url),
);
import sharp from "sharp";
import { slots, GROUPS, COLORS } from "../src/layout";
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
let body = text(268, 65, "DUNGEON", 24);
for (let i = 0; i < 5; i++) {
  const y = 190 + i * 170;
  if (i > 0) body += `<path d="M30 ${y - 85}H390" stroke="#b7a88d" stroke-width="1"/>`;
  body += text(90, y - 27, `B${i + 1}`, 18, "#76664f");
  body += `<circle cx="90" cy="${y}" r="24" fill="none" stroke="#b7a88d" stroke-width="1"/>`;
  if (i < 4) body += text(260, y + 14, ["≥ 20", "≥ 24", "≥ 26", "≤ 9"][i], 46);
  else {
    body += text(260, y - 6, "FIVE OF", 29);
    body += text(260, y + 31, "A KIND", 29);
  }
}
await fs.writeFile("art/board.svg", wrap(420, 1020, body));
await sharp(Buffer.from(wrap(420, 1020, body))).png().toFile(`${out}/board.png`);
for (const [g, group] of GROUPS.entries()) {
  let b = `<rect x="12" y="12" width="426" height="7" fill="${COLORS[group]}"/>`;
  b += text(225, 72, ["Strength", "Dexterity", "Intellect"][g], 29, COLORS[group]);
  slots.filter((s) => s.group === group).forEach((s, i) => {
    const y = 190 + i * 100;
    b += `<path d="M30 ${y + 50}H420" stroke="#b7a88d" stroke-width="1"/><circle cx="60" cy="${y}" r="20" fill="none" stroke="${COLORS[group]}" stroke-width="1.2"/>`;
    b += text(262, y + 10, s.mark, s.mark.length > 12 ? 28 : 32);
  });
  const svg = wrap(450, 680, b);
  await fs.writeFile(`art/${group}.svg`, svg);
  await sharp(Buffer.from(svg)).png().toFile(`${out}/${group}.png`);
}
const wood = await sharp("art/textures/maple.png")
  .modulate({ saturation: 0, brightness: 0.7 })
  .png()
  .toBuffer();
await fs.writeFile(`${out}/table.png`, wood);
console.log("Printed board and three ability boards");

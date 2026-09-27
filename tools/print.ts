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
const corner = (x: number, y: number, sx: number, sy: number) =>
  `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="#987546"><path d="M0 45V0H45M6 32V6H32" stroke-width="2"/><path d="M12 26Q12 12 26 12M0 17 17 0M20 0 0 20"/><path d="M8 8h8v8H8Z" fill="#b29259"/></g>`;
const wrap = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="3" seed="17"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="100%" height="100%" fill="#e1d6bd"/><rect width="100%" height="100%" filter="url(#paper)" opacity=".035"/><rect x="12" y="12" width="${w - 24}" height="${h - 24}" fill="none" stroke="#806543" stroke-width="2"/><rect x="18" y="18" width="${w - 36}" height="${h - 36}" fill="none" stroke="#ae9365"/>${body}${corner(12,12,1,1)}${corner(w-12,12,-1,1)}${corner(12,h-12,1,-1)}${corner(w-12,h-12,-1,-1)}</svg>`;
const crest = (g: number) => {
  const paths = [
    'M0-26 7-17 4 9H-4L-7-17ZM-15 11H15M0 11V28M-7 28H7',
    'M-12-27Q28 0-12 27M-12-27V27M-23 0H25M17-7 25 0 17 7',
    'M0-28 7-8 27 0 7 8 0 28-7 8-27 0-7-8ZM-18-19-13-14M18 19 13 14',
  ];
  return `<g transform="translate(73 72)" stroke="#eddbad" fill="none"><path d="M0-43 32-31V9Q29 31 0 44Q-29 31-32 9V-31Z" stroke-width="1.5"/><path d="${paths[g]}" stroke-width="2.5" stroke-linejoin="round"/></g>`;
};
const roleSize = 32;
const headingSize = 29;
{
  const layout = makeLayout();
  const d = layout.dungeon;
  const dw = Math.round(d.width * 100), dh = Math.round(d.depth * 100);
  let body = `<path d="M26 26H${dw-26}V112H26Z" fill="#554d40"/><path d="M32 32H${dw-32}V106H32Z" fill="none" stroke="#bb9b62"/>` + text(dw / 2, 78, "DUNGEON", headingSize, "#f0dfb9");
  layout.slots.filter((s) => s.group === "dungeon").forEach((s, i, floors) => {
    const y = (s.z - d.z + d.depth / 2) * 100;
    if (i < 4) {
      const nextY = (floors[i + 1].z - d.z + d.depth / 2) * 100;
      const dividerY = (y + nextY) / 2;
      body += `<path d="M30 ${dividerY}H73M107 ${dividerY}H${dw-30}" stroke="#b9a680"/><path d="M84 ${dividerY-4}H96L90 ${dividerY+5}Z" fill="#987546"/>`;
    }
    body += text(90, y - 41, s.label, 18, "#76664f");
    body += `<circle cx="90" cy="${y}" r="29" fill="#c9b995" stroke="#967c56"/><circle cx="90" cy="${y}" r="24" fill="none" stroke="#f2e4c4"/>`;
    if (i < 4) body += text(260, y + 10, s.mark, roleSize);
    else body += text(260, y - 6, "FIVE OF", roleSize) + text(260, y + 31, "A KIND", roleSize);
  });
  const dungeonSvg = wrap(dw, dh, body);
  await fs.writeFile(`art/board.svg`, dungeonSvg);
  await sharp(Buffer.from(dungeonSvg)).png().toFile(`${out}/board.png`);
  for (const [g, group] of GROUPS.entries()) {
    const board = layout.abilities[g];
    const w = Math.round(board.width * 100), h = Math.round(board.depth * 100);
    let b = `<rect x="26" y="26" width="${w-52}" height="98" fill="${COLORS[group]}"/><rect x="32" y="32" width="${w-64}" height="86" fill="none" stroke="#d5bb83" stroke-width="1"/>${crest(g)}`;
    b += text(267, 82, ["Strength", "Dexterity", "Intellect"][g], headingSize, "#fff0cf");
    layout.slots.filter((s) => s.group === group).forEach((s) => {
      const x = (s.x - board.x + board.width / 2) * 100;
      const y = (s.z - board.z + board.depth / 2) * 100;
      const mark = (markerX(s) - board.x + board.width / 2) * 100;
      b += `<rect x="30" y="${y-41}" width="${w-60}" height="82" rx="2" fill="${COLORS[group]}" fill-opacity=".055" stroke="#b9a680"/><path d="M104 ${y-31}V${y+31}M${w-42} ${y-28}h-9M${w-42} ${y-28}v9M${w-42} ${y+28}h-9M${w-42} ${y+28}v-9" fill="none" stroke="#af9668"/><circle cx="${mark}" cy="${y}" r="26" fill="#cdbd9a" stroke="${COLORS[group]}" stroke-width="1.2"/><circle cx="${mark}" cy="${y}" r="21" fill="none" stroke="#f6e9ca"/>`;
      b += text(x + 37, y + 10, s.mark, roleSize);
    });
    b += `<path d="M35 550H${w-35}M35 554H${w-35}" stroke="#b19665"/><path d="M${w/2-7} 552l7-7 7 7-7 7Z" fill="#b19665"/>`;
    const svg = wrap(w, h, b);
    await fs.writeFile(`art/${group}.svg`, svg);
    await sharp(Buffer.from(svg)).png().toFile(`${out}/${group}.png`);
  }
}
const wood = await sharp("art/textures/maple.png")
  .modulate({ saturation: 0, brightness: 0.7 })
  .png()
  .toBuffer();
await fs.writeFile(`${out}/table.png`, wood);
console.log("Printed board and three ability boards");

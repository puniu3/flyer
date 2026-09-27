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
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><pattern id="paper" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 3h3M6 7h2" stroke="#80623d" stroke-opacity=".08" stroke-width=".5"/></pattern></defs><rect width="100%" height="100%" fill="#cdbd9f"/><rect width="100%" height="100%" fill="url(#paper)"/><rect x="12" y="12" width="${w - 24}" height="${h - 24}" rx="2" fill="none" stroke="#695439" stroke-width="2"/><rect x="18" y="18" width="${w - 36}" height="${h - 36}" fill="none" stroke="#695439" stroke-width=".5"/>${body}</svg>`;
let body = text(770, 70, "DUNGEON", 30);
for (let i = 0; i < 5; i++) {
  const x = 210 + i * 280;
  body += `<path d="M${x - 89} 330V192Q${x} 88 ${x + 89} 192V330Z" fill="#bba482" stroke="#7d6648" stroke-width="2"/><path d="M${x - 71} 317V199Q${x} 115 ${x + 71} 199V317Z" fill="#cdb68d" stroke="#8b7352"/>`;
  for (let row = 0; row < 6; row++) {
    const y = 191 + row * 22;
    body += `<path d="M${x - 87} ${y}h17m140 0h17" stroke="#7c6345" stroke-width="1"/>`;
  }
  body += `<path d="M${x - 110} 318v-96m220 0v96M${x - 117} 230h14m206 0h14" stroke="#8c7150" stroke-width="1.5"/>`;
  body += text(x, 181, `B${i + 1}`, 26);
  if (i < 4) {
    body += text(
      x,
      270,
      ["≥ 20", "≥ 24", "≥ 26", "≤ 9"][i],
      48,
      "#251c15",
      'font-weight="bold"',
    );
  } else {
    body += text(x, 236, "5 OF", 34, "#251c15", 'font-weight="bold"');
    body += text(x, 281, "A KIND", 34, "#251c15", 'font-weight="bold"');
  }
  body += `<circle cx="${x}" cy="361" r="25" fill="#d8c59f" stroke="#695439" stroke-width="1.5"/>`;
  if (i < 4)
    body += `<path d="M${x + 100} 257h79m-8-5 8 5-8 5" fill="none" stroke="#947b58" stroke-width="2"/>`;
}
for (const x of [46, 1494])
  for (const y of [46, 410])
    body += `<path d="M${x - 8} ${y}l8-8 8 8-8 8Z" fill="#786044"/>`;
body += `<path d="M60 83H440m660 0h380M90 78l-9 5 9 5m1360-10 9 5-9 5" stroke="#8c7150" fill="none"/>`;
body += text(88, 405, "✦", 23) + text(1452, 405, "✦", 23);
await fs.writeFile("art/board.svg", wrap(1540, 456, body));
await sharp(Buffer.from(wrap(1540, 456, body)))
  .png()
  .toFile(`${out}/board.png`);
for (const [g, group] of GROUPS.entries()) {
  let b = `<path d="M24 24H456V103H24Z" fill="${COLORS[group]}"/>`;
  b += text(
    265,
    75,
    ["S T R E N G T H", "D E X T E R I T Y", "I N T E L L E C T"][g],
    22,
    "#efe0c0",
  );
  const icons = [
    '<path d="M55 40l8-9 8 9v30H55Zm-8 32h32M63 73v17m-5 0h10"/>',
    '<path d="M54 31q43 27 0 58m0-58v58m-6-29h34m-7-6 7 6-7 6"/>',
    '<path d="M63 32 69 52 88 60 69 67 63 88 56 67 39 60 56 52Z"/>',
  ];
  b += `<g fill="none" stroke="#ead7b4" stroke-width="2">${icons[g]}</g>`;
  slots
    .filter((s) => s.group === group)
    .forEach((s, i) => {
      const y = 149 + i * 86;
      b += `<rect x="33" y="${y - 29}" width="414" height="65" rx="2" fill="${i % 2 ? "#c3ae8b" : "#d1bea0"}" stroke="#ac9470"/><circle cx="72" cy="${y + 3}" r="18" fill="none" stroke="${COLORS[group]}" stroke-width="1.5"/>`;
      b += text(262, y + 11, s.mark, 27);
      b += `<path d="M106 ${y - 19}v44" stroke="#b39a75"/><path d="M426 ${y - 20}h8v8m0 25v8h-8" fill="none" stroke="${COLORS[group]}" stroke-opacity=".5"/>`;
    });

  const svg = wrap(480, 520, b);
  await fs.writeFile(`art/${group}.svg`, svg);
  await sharp(Buffer.from(svg)).png().toFile(`${out}/${group}.png`);
}
const wood = await sharp("art/textures/maple.png")
  .modulate({ saturation: 0, brightness: 0.7 })
  .png()
  .toBuffer();
await fs.writeFile(`${out}/table.png`, wood);
console.log("Printed board and three ability boards");

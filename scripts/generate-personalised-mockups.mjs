/**
 * Realistic Jinglefold personalised product mockups (warm studio background).
 * Usage: node scripts/generate-personalised-mockups.mjs
 */
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const PORTRAIT = path.join(ROOT, "public/examples/pet-after.jpg");
const OUT = path.join(ROOT, "public/stores/jinglefold/mockups");
const MANIFEST_PATH = path.join(ROOT, "config/catalogue/product-images.manifest.json");
const SIZE = 900;
const BG = { r: 255, g: 248, b: 240 };

const MOCKUPS = [
  { sku: "XMAS-PLAS-BAUB", file: "bauble-shatterproof.webp", kind: "bauble", accent: "#9b1c1c" },
  { sku: "XMAS-PORC-BAUB", file: "ornament-ceramic.webp", kind: "bauble", accent: "#c41e3a" },
  { sku: "XMAS-WOOD", file: "ornament-wood.webp", kind: "wood-disc" },
  { sku: "XMAS-ALUM-SQ", file: "ornament-aluminium.webp", kind: "aluminium" },
  { sku: "XMAS-GLASS-SQ", file: "ornament-glass.webp", kind: "glass" },
  { sku: "PF-716", file: "stocking.webp", kind: "stocking" },
  { sku: "XMAS-PLAS-BAUB-3", file: "bauble-trio.webp", kind: "trio" },
];

function warmBackgroundSvg() {
  return Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#fffdf8"/>
      <stop offset="100%" stop-color="#f3e6d6"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
</svg>`);
}

function baubleSvg(cx, cy, r, accent) {
  return Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sphere" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="${accent}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#2a0a0a"/>
    </radialGradient>
    <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8d48a"/>
      <stop offset="100%" stop-color="#9a7b2e"/>
    </linearGradient>
  </defs>
  <ellipse cx="${cx}" cy="${cy + r + 18}" rx="${r * 0.85}" ry="16" fill="#000" opacity="0.12"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sphere)"/>
  <ellipse cx="${cx - r * 0.28}" cy="${cy - r * 0.38}" rx="${r * 0.42}" ry="${r * 0.26}" fill="#fff" opacity="0.62"/>
  <ellipse cx="${cx + r * 0.2}" cy="${cy + r * 0.25}" rx="${r * 0.5}" ry="${r * 0.35}" fill="#000" opacity="0.08"/>
  <rect x="${cx - 22}" y="${cy - r - 28}" width="44" height="22" rx="6" fill="url(#cap)"/>
  <rect x="${cx - 6}" y="${cy - r - 40}" width="12" height="14" rx="3" fill="#b8963e"/>
</svg>`);
}

function portraitCircle(size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  return sharp(PORTRAIT).resize(size, size, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function buildBaubleSimple(accent) {
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 30;
  const r = 210;
  const portraitR = r - 14;
  const dim = portraitR * 2;
  const face = await sharp(PORTRAIT).resize(dim, dim, { fit: "cover" }).png().toBuffer();
  const circleMask = Buffer.from(
    `<svg width="${dim}" height="${dim}"><circle cx="${portraitR}" cy="${portraitR}" r="${portraitR}" fill="white"/></svg>`,
  );
  const roundFace = await sharp(face).composite([{ input: circleMask, blend: "dest-in" }]).png().toBuffer();
  const overlay = await sharp(baubleSvg(cx, cy, r, accent)).png().toBuffer();
  const bg = await sharp(warmBackgroundSvg()).png().toBuffer();
  return sharp(bg)
    .composite([
      { input: roundFace, top: Math.round(cy - portraitR), left: Math.round(cx - portraitR) },
      { input: overlay, top: 0, left: 0 },
    ])
    .webp({ quality: 88 })
    .toBuffer();
}

async function buildPlaque(kind) {
  const w = 420;
  const h = 520;
  const x = (SIZE - w) / 2;
  const y = 200;
  const fill = kind === "glass" ? "#dfe8f0" : kind === "aluminium" ? "#d8dce2" : "#e8dcc8";
  const frame = Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="${SIZE / 2}" cy="${y + h + 24}" rx="${w * 0.45}" ry="14" fill="#000" opacity="0.1"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${fill}" stroke="#b8963e" stroke-width="10"/>
  <rect x="${x + 24}" y="${y + 24}" width="${w - 48}" height="${h - 48}" rx="18" fill="#fff8f0"/>
  <path d="M ${SIZE / 2 - 30} ${y - 8} Q ${SIZE / 2} ${y - 36} ${SIZE / 2 + 30} ${y - 8}" fill="none" stroke="#b8963e" stroke-width="6"/>
</svg>`);
  const photo = await sharp(PORTRAIT).resize(w - 80, h - 120, { fit: "cover" }).png().toBuffer();
  return sharp(warmBackgroundSvg())
    .composite([
      { input: await sharp(frame).png().toBuffer(), top: 0, left: 0 },
      { input: photo, top: y + 60, left: x + 40 },
    ])
    .webp({ quality: 88 })
    .toBuffer();
}

async function buildWoodDisc() {
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 20;
  const r = 200;
  const wood = Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="${cx}" cy="${cy + r + 16}" rx="${r}" ry="14" fill="#000" opacity="0.1"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#8b5a2b"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 6}" fill="#a66b38" opacity="0.85"/>
  <circle cx="${cx - 40}" cy="${cy - 50}" r="80" fill="#fff" opacity="0.08"/>
</svg>`);
  const portraitR = r - 28;
  const dim = portraitR * 2;
  const face = await sharp(PORTRAIT).resize(dim, dim, { fit: "cover" }).png().toBuffer();
  const circleMask = Buffer.from(
    `<svg width="${dim}" height="${dim}"><circle cx="${portraitR}" cy="${portraitR}" r="${portraitR}" fill="white"/></svg>`,
  );
  const roundFace = await sharp(face).composite([{ input: circleMask, blend: "dest-in" }]).png().toBuffer();
  return sharp(warmBackgroundSvg())
    .composite([
      { input: await sharp(wood).png().toBuffer(), top: 0, left: 0 },
      { input: roundFace, top: Math.round(cy - portraitR), left: Math.round(cx - portraitR) },
    ])
    .webp({ quality: 88 })
    .toBuffer();
}

async function buildStocking() {
  const svg = Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sock" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
  </defs>
  <ellipse cx="${SIZE / 2}" cy="780" rx="200" ry="18" fill="#000" opacity="0.12"/>
  <path d="M 320 120 L 580 120 L 560 720 Q 450 820 340 720 L 320 120 Z" fill="url(#sock)"/>
  <rect x="300" y="100" width="300" height="70" rx="12" fill="#faf5ee"/>
  <rect x="360" y="220" width="180" height="220" rx="12" fill="#fff8f0" stroke="#e8d5c4" stroke-width="4"/>
</svg>`);
  const photo = await sharp(PORTRAIT).resize(160, 200, { fit: "cover" }).png().toBuffer();
  return sharp(warmBackgroundSvg())
    .composite([
      { input: await sharp(svg).png().toBuffer(), top: 0, left: 0 },
      { input: photo, top: 240, left: 370 },
    ])
    .webp({ quality: 88 })
    .toBuffer();
}

async function buildTrio() {
  const branch = Buffer.from(`
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <path d="M 80 520 Q 450 380 820 500" stroke="#3d2914" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M 200 460 Q 280 420 320 500" stroke="#2d5016" stroke-width="8" fill="none"/>
  <path d="M 600 440 Q 680 400 720 480" stroke="#2d5016" stroke-width="8" fill="none"/>
</svg>`);
  const positions = [
    { cx: 250, cy: 480, accent: "#9b1c1c" },
    { cx: 450, cy: 420, accent: "#1f4d3a" },
    { cx: 650, cy: 470, accent: "#9b1c1c" },
  ];
  let base = sharp(warmBackgroundSvg());
  const layers = [{ input: await sharp(branch).png().toBuffer(), top: 0, left: 0 }];
  for (const { cx, cy, accent } of positions) {
    const mini = await buildBaubleMini(cx, cy, 95, accent);
    layers.push({ input: mini, top: 0, left: 0 });
  }
  return base.composite(layers).webp({ quality: 88 }).toBuffer();
}

async function buildBaubleMini(cx, cy, r, accent) {
  const portraitR = r - 10;
  const dim = portraitR * 2;
  const face = await sharp(PORTRAIT).resize(dim, dim, { fit: "cover" }).png().toBuffer();
  const circleMask = Buffer.from(
    `<svg width="${dim}" height="${dim}"><circle cx="${portraitR}" cy="${portraitR}" r="${portraitR}" fill="white"/></svg>`,
  );
  const roundFace = await sharp(face).composite([{ input: circleMask, blend: "dest-in" }]).png().toBuffer();
  const overlay = await sharp(baubleSvg(cx, cy, r, accent)).png().toBuffer();
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: roundFace, top: Math.round(cy - portraitR), left: Math.round(cx - portraitR) },
      { input: overlay, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
}

async function buildMockup(item) {
  switch (item.kind) {
    case "bauble":
      return buildBaubleSimple(item.accent);
    case "aluminium":
      return buildPlaque("aluminium");
    case "glass":
      return buildPlaque("glass");
    case "wood-disc":
      return buildWoodDisc();
    case "stocking":
      return buildStocking();
    case "trio":
      return buildTrio();
    default:
      throw new Error(`Unknown kind ${item.kind}`);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));

  for (const item of MOCKUPS) {
    const buf = await buildMockup(item);
    const rel = `/stores/jinglefold/mockups/${item.file}`;
    await writeFile(path.join(OUT, item.file), buf);
    const meta = await sharp(buf).metadata();
    const imageMeta = {
      path: rel,
      width: meta.width ?? SIZE,
      height: meta.height ?? SIZE,
      alt: `Example personalised ${item.sku} with sample pet portrait`,
    };
    manifest[`jinglefold:${item.sku}`] = {
      main: imageMeta,
      gallery: [imageMeta],
      source: "mockup:public/examples/pet-after.jpg",
    };
    console.log("mockup", item.sku, rel);
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

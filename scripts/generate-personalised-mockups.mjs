/**
 * Composites Pawtraitry sample art onto simple ornament/stocking mockups.
 * Usage: node scripts/generate-personalised-mockups.mjs
 */
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const PORTRAIT = path.join(ROOT, "public/examples/pet-after.jpg");
const OUT = path.join(ROOT, "public/stores/jinglefold/mockups");
const MANIFEST_PATH = path.join(ROOT, "config/catalogue/product-images.manifest.json");

const MOCKUPS = [
  { sku: "XMAS-PLAS-BAUB", file: "bauble-shatterproof.jpg", shape: "circle" },
  { sku: "XMAS-ALUM-SQ", file: "ornament-aluminium.jpg", shape: "square" },
  { sku: "XMAS-GLASS-SQ", file: "ornament-glass.jpg", shape: "square" },
  { sku: "XMAS-PORC-BAUB", file: "ornament-ceramic.jpg", shape: "circle" },
  { sku: "XMAS-WOOD", file: "ornament-wood.jpg", shape: "circle" },
  { sku: "PF-716", file: "stocking.jpg", shape: "stocking" },
  { sku: "XMAS-PLAS-BAUB-3", file: "bauble-trio.jpg", shape: "trio" },
];

async function buildMockup({ shape, file }) {
  const size = 800;
  const portrait = await sharp(PORTRAIT).resize(520, 520, { fit: "cover" }).toBuffer();

  if (shape === "stocking") {
    const base = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 140, g: 28, b: 36, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const cuff = await sharp({
      create: { width: size, height: 120, channels: 4, background: { r: 245, g: 240, b: 230, alpha: 1 } },
    })
      .png()
      .toBuffer();
    return sharp(base)
      .composite([
        { input: cuff, top: 40, left: 0 },
        { input: await sharp(portrait).resize(360, 360, { fit: "cover" }).toBuffer(), top: 200, left: 220 },
      ])
      .jpeg({ quality: 88 })
      .toBuffer();
  }

  if (shape === "trio") {
    const tile = await sharp(portrait).resize(180, 180, { fit: "cover" }).png().toBuffer();
    const bg = sharp({
      create: { width: size, height: size, channels: 4, background: { r: 28, g: 74, b: 52, alpha: 1 } },
    });
    const positions = [140, 310, 480];
    const composites = positions.map((left) => ({ input: tile, top: 310, left }));
    return bg.composite(composites).jpeg({ quality: 88 }).toBuffer();
  }

  const mask =
    shape === "square"
      ? Buffer.from(`<svg width="${size}" height="${size}"><rect x="80" y="80" width="640" height="640" rx="24" fill="white"/></svg>`)
      : Buffer.from(`<svg width="${size}" height="${size}"><circle cx="400" cy="420" r="280" fill="white"/></svg>`);

  const framed = await sharp(portrait)
    .resize(560, 560, { fit: "cover" })
    .composite([{ input: await sharp(mask).resize(560, 560).png().toBuffer(), blend: "dest-in" }])
    .png()
    .toBuffer();

  const bgColor =
    shape === "square" ? { r: 200, g: 200, b: 210, alpha: 1 } : { r: 180, g: 32, b: 40, alpha: 1 };

  return sharp({
    create: { width: size, height: size, channels: 4, background: bgColor },
  })
    .composite([{ input: framed, top: 120, left: 120 }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    manifest = {};
  }

  for (const item of MOCKUPS) {
    const buf = await buildMockup(item);
    const rel = `/stores/jinglefold/mockups/${item.file}`;
    const dest = path.join(OUT, item.file);
    await writeFile(dest, buf);
    const meta = await sharp(buf).metadata();
    const imageMeta = {
      path: rel,
      width: meta.width ?? 800,
      height: meta.height ?? 800,
      alt: `Example personalised ${item.sku} with sample pet portrait`,
    };
    manifest[`jinglefold:${item.sku}`] = {
      main: imageMeta,
      gallery: [imageMeta],
      source: "mockup:public/examples/pet-after.jpg",
    };
    console.log("mockup", item.sku, rel);
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

main();

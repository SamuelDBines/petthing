/**
 * Ingest Go Dropship product images from uploads/products-extract/products/
 * → public/stores/products/{store}/{sku}.webp (+ gallery suffixes)
 * Updates config/catalogue/product-images.manifest.json
 *
 * Usage: node scripts/ingest-godropship-products.mjs
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "uploads/products-extract/products");
const SRC_MANIFEST = path.join(SRC_ROOT, "manifest.json");
const OUT_ROOT = path.join(ROOT, "public/stores/products");
const MANIFEST_PATH = path.join(ROOT, "config/catalogue/product-images.manifest.json");

const SKIP_SKUS = new Set(["HB-76661", "GEM-76737"]);

/** Tile SKUs per kit (order preserved; duplicates = multiple tiles). */
const KIT_TILES = {
  "FX-KIT-CAR": ["CAR-46787", "AB6701"],
  "FX-KIT-DOOR": ["HOM-76459", "CAR-46787"],
  "FX-KIT-GARDEN": ["HOM-56098", "HOM-55115", "HOM-55115-2"],
  "XM-KIT-TREE": ["GEM-76745", "GEM-76752", "GEM-76758"],
};

const CANVAS = 1200;
const GUTTER = 24;
const BADGE_H = 56;
const CANVAS_BG = { r: 252, g: 250, b: 247, alpha: 1 };

async function toWebp(srcPath, destPath, width, height) {
  await mkdir(path.dirname(destPath), { recursive: true });
  const pipeline = sharp(srcPath).rotate();
  const meta = await pipeline.metadata();
  const w = width ?? meta.width ?? 1254;
  const h = height ?? meta.height ?? 1254;
  await pipeline.webp({ quality: 82, effort: 4 }).toFile(destPath);
  const outMeta = await sharp(destPath).metadata();
  return {
    width: outMeta.width ?? w,
    height: outMeta.height ?? h,
    bytes: outMeta.size ?? 0,
  };
}

function galleryPath(store, sku, index) {
  if (index === 0) return `/stores/products/${store}/${sku}.webp`;
  return `/stores/products/${store}/${sku}-${index + 1}.webp`;
}

function componentImagePath(store, sku) {
  const webp = path.join(OUT_ROOT, store, `${sku}.webp`);
  return webp;
}

async function loadComponentTile(store, sku) {
  const webp = componentImagePath(store, sku);
  try {
    await sharp(webp).metadata();
    return webp;
  } catch {
    const entry = (await readManifestProducts()).find((p) => p.sku === sku);
    const rel = entry?.images?.[0]?.file;
    if (!rel) return null;
    const src = path.join(SRC_ROOT, rel);
    await toWebp(src, webp);
    return webp;
  }
}

let manifestProductsCache;
async function readManifestProducts() {
  if (!manifestProductsCache) {
    const raw = JSON.parse(await readFile(SRC_MANIFEST, "utf8"));
    manifestProductsCache = raw.products;
  }
  return manifestProductsCache;
}

function kitBadgeSvg(itemCount) {
  return Buffer.from(`
<svg width="${CANVAS}" height="${BADGE_H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="24" y="10" width="210" height="44" rx="10" fill="#1a2e1f"/>
  <text x="129" y="38" text-anchor="middle" font-family="system-ui,sans-serif" font-size="17" font-weight="700" fill="#fff8f0">Kit · ${itemCount} items</text>
</svg>`);
}

async function resizedToFit(imagePath, maxW, maxH, { cover = false } = {}) {
  if (cover) {
    const buffer = await sharp(imagePath).resize(maxW, maxH, { fit: "cover", position: "centre" }).toBuffer();
    return { buffer, w: maxW, h: maxH };
  }
  const meta = await sharp(imagePath).metadata();
  const scale = Math.min(maxW / (meta.width ?? maxW), maxH / (meta.height ?? maxH));
  const w = Math.max(1, Math.round((meta.width ?? maxW) * scale));
  const h = Math.max(1, Math.round((meta.height ?? maxH) * scale));
  const buffer = await sharp(imagePath).resize(w, h, { fit: "inside" }).toBuffer();
  return { buffer, w, h };
}

async function buildBundleComposite(store, sku, components, bySku) {
  const tiles = KIT_TILES[sku] ?? components ?? [];
  const paths = [];
  for (const comp of tiles) {
    const p = await loadComponentTile(store, comp);
    if (p) paths.push(p);
  }
  if (!paths.length) return null;

  const itemCount = tiles.length;
  const contentTop = BADGE_H + 4;
  const contentH = CANVAS - contentTop - GUTTER;
  const contentW = CANVAS - GUTTER * 2;
  const composites = [];

  if (paths.length === 3) {
    const leftW = Math.floor(contentW * 0.54);
    const rightW = contentW - leftW - GUTTER;
    const rightH = (contentH - GUTTER) / 2;
    const hero = await resizedToFit(paths[0], leftW, contentH);
    composites.push({
      input: hero.buffer,
      left: GUTTER + Math.floor((leftW - hero.w) / 2),
      top: contentTop + Math.floor((contentH - hero.h) / 2),
    });
    for (let i = 1; i < 3; i++) {
      const tile = await resizedToFit(paths[i], rightW, rightH);
      composites.push({
        input: tile.buffer,
        left: GUTTER + leftW + GUTTER + Math.floor((rightW - tile.w) / 2),
        top: contentTop + (i - 1) * (rightH + GUTTER) + Math.floor((rightH - tile.h) / 2),
      });
    }
  } else {
    const cols = paths.length;
    const cellW = (contentW - GUTTER * (cols - 1)) / cols;
    const fillTile = cols <= 2;
    for (let i = 0; i < paths.length; i++) {
      const tile = await resizedToFit(paths[i], cellW, contentH, { cover: fillTile });
      composites.push({
        input: tile.buffer,
        left: GUTTER + i * (cellW + GUTTER),
        top: contentTop,
      });
    }
  }

  composites.unshift({ input: await sharp(kitBadgeSvg(itemCount)).png().toBuffer(), top: 0, left: 0 });

  const buf = await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: CANVAS_BG,
    },
  })
    .composite(composites)
    .webp({ quality: 86 })
    .toBuffer();

  const rel = galleryPath(store, sku, 0);
  const dest = path.join(ROOT, "public", rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return {
    path: rel,
    width: CANVAS,
    height: CANVAS,
    bytes: buf.length,
    alt: `${sku} bundle, ${itemCount} items`,
  };
}

async function ingestProduct(store, product, bySku) {
  const { sku, name, images, bundle, components } = product;
  if (SKIP_SKUS.has(sku)) return null;

  if (bundle && (components?.length || KIT_TILES[sku])) {
    const main = await buildBundleComposite(store, sku, components, bySku);
    if (!main) return null;
    return {
      main,
      gallery: [main],
      source: `bundle:${(KIT_TILES[sku] ?? components).join("+")}`,
    };
  }

  if (!images?.length) return null;

  const gallery = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = path.join(SRC_ROOT, img.file);
    const rel = galleryPath(store, sku, i);
    const dest = path.join(ROOT, "public", rel);
    const meta = await toWebp(src, dest, img.width, img.height);
    gallery.push({
      path: rel,
      width: meta.width,
      height: meta.height,
      bytes: meta.bytes,
      alt: `${name}, image ${i + 1}`,
    });
  }

  const main = gallery[0];
  const source = product.source_page_url ?? "godropship";
  return { main, gallery, source };
}

async function main() {
  const raw = JSON.parse(await readFile(SRC_MANIFEST, "utf8"));
  const bySku = new Map(raw.products.map((p) => [p.sku, p]));

  let existing = {};
  try {
    existing = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    existing = {};
  }

  const manifest = { ...existing };
  for (const key of Object.keys(manifest)) {
    if (key.startsWith("fixmonger:") || key.startsWith("jinglefold:")) {
      const sku = key.split(":")[1];
      if (!sku.startsWith("XMAS-") && !sku.startsWith("PF-")) {
        delete manifest[key];
      }
    }
  }

  const nonBundles = raw.products.filter((p) => !p.bundle && !SKIP_SKUS.has(p.sku));
  const bundles = raw.products.filter((p) => p.bundle && !SKIP_SKUS.has(p.sku));

  for (const product of nonBundles) {
    for (const store of product.stores ?? []) {
      const entry = await ingestProduct(store, product, bySku);
      if (entry) manifest[`${store}:${product.sku}`] = entry;
      console.log(store, product.sku, entry ? "ok" : "skip");
    }
  }

  for (const product of bundles) {
    for (const store of product.stores ?? []) {
      const entry = await ingestProduct(store, product, bySku);
      if (entry) manifest[`${store}:${product.sku}`] = entry;
      console.log(store, product.sku, entry ? "bundle" : "skip");
    }
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("wrote", MANIFEST_PATH, Object.keys(manifest).length, "entries");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Ingest Go Dropship product images from uploads/products-extract/products/
 * → public/stores/products/{store}/{sku}.webp (+ gallery suffixes)
 * Updates config/catalogue/product-images.manifest.json
 *
 * Usage: node scripts/ingest-godropship-products.mjs
 */
import { mkdir, readFile, writeFile, copyFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, "uploads/products-extract/products");
const SRC_MANIFEST = path.join(SRC_ROOT, "manifest.json");
const OUT_ROOT = path.join(ROOT, "public/stores/products");
const MANIFEST_PATH = path.join(ROOT, "config/catalogue/product-images.manifest.json");

const SKIP_SKUS = new Set(["HB-76661", "GEM-76737"]);

async function toWebp(srcPath, destPath, width, height) {
  await mkdir(path.dirname(destPath), { recursive: true });
  const pipeline = sharp(srcPath).rotate();
  const meta = await pipeline.metadata();
  const w = width ?? meta.width ?? 1254;
  const h = height ?? meta.height ?? 1254;
  await pipeline
    .webp({ quality: 82, effort: 4 })
    .toFile(destPath);
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

async function firstComponentWebp(store, sku, bySku) {
  const entry = bySku.get(sku);
  if (!entry?.images?.length) return null;
  const rel = entry.images[0].file;
  const src = path.join(SRC_ROOT, rel);
  const dest = path.join(OUT_ROOT, store, `${sku}-component.webp`);
  try {
    await toWebp(src, dest);
    return dest;
  } catch {
    return null;
  }
}

async function buildBundleComposite(store, sku, components, bySku) {
  const tiles = [];
  for (const comp of components) {
    const p = await firstComponentWebp(store, comp, bySku);
    if (p) tiles.push(p);
  }
  if (!tiles.length) return null;

  const size = 1200;
  const cols = tiles.length >= 3 ? 3 : tiles.length;
  const rows = Math.ceil(tiles.length / cols);
  const cell = Math.floor(size / cols);
  const composites = [];
  for (let i = 0; i < tiles.length; i++) {
    const tileBuf = await sharp(tiles[i])
      .resize(cell - 24, cell - 24, { fit: "contain", background: { r: 255, g: 253, b: 248, alpha: 1 } })
      .toBuffer();
    const col = i % cols;
    const row = Math.floor(i / cols);
    composites.push({
      input: tileBuf,
      left: col * cell + 12,
      top: row * cell + 12,
    });
  }
  const height = rows * cell;
  const buf = await sharp({
    create: {
      width: size,
      height,
      channels: 4,
      background: { r: 247, g: 244, b: 238, alpha: 1 },
    },
  })
    .composite(composites)
    .webp({ quality: 85 })
    .toBuffer();

  const rel = galleryPath(store, sku, 0);
  const dest = path.join(ROOT, "public", rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  const meta = await sharp(buf).metadata();
  return {
    path: rel,
    width: meta.width ?? size,
    height: meta.height ?? height,
    bytes: buf.length,
    alt: `${sku} bundle — includes ${components.join(", ")}`,
  };
}

async function ingestProduct(store, product, bySku) {
  const { sku, name, images, bundle, components } = product;
  if (SKIP_SKUS.has(sku)) return null;

  if (bundle && components?.length) {
    const main = await buildBundleComposite(store, sku, components, bySku);
    if (!main) return null;
    return {
      main,
      gallery: [main],
      source: `bundle:${components.join("+")}`,
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
      alt: `${name} — image ${i + 1}`,
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

  for (const product of raw.products) {
    if (SKIP_SKUS.has(product.sku)) continue;
    for (const store of product.stores ?? []) {
      const entry = await ingestProduct(store, product, bySku);
      if (entry) manifest[`${store}:${product.sku}`] = entry;
      console.log(store, product.sku, entry ? "ok" : "skip");
    }
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("wrote", MANIFEST_PATH, Object.keys(manifest).length, "entries");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

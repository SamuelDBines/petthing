/**
 * Assigns Fixmonger catalogue images: reuse Go Dropship assets where SKUs overlap,
 * otherwise crop category tiles from the hero photo.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "config/catalogue/product-images.manifest.json");
const HERO = path.join(ROOT, "public/stores/fixmonger/hero.jpg");
const OUT = path.join(ROOT, "public/stores/products/fixmonger");

/** SKU -> shared jinglefold SKU with godropship images */
const REUSE = { "GEM-76744": "GEM-76744" };

/** SKU -> hero crop region [left, top, width, height] on 1600x900 reference */
const CROPS = {
  "HOM-76459": [0, 0, 800, 500],
  "HOM-76454": [0, 0, 800, 500],
  "FX-KIT-DOOR": [0, 0, 800, 500],
  "CAR-46787": [800, 0, 800, 500],
  "HOM-62916": [800, 0, 800, 500],
  "CAR-63366": [800, 250, 800, 500],
  "CAR-76112": [800, 250, 800, 500],
  "CAR-75067": [800, 250, 800, 500],
  "HB-75865": [800, 250, 800, 500],
  "FX-KIT-CAR": [800, 0, 800, 500],
  "HOM-74935": [400, 400, 800, 500],
  "AB6701": [400, 400, 800, 500],
  "HOM-56098": [0, 400, 800, 500],
  "HOM-55115": [0, 400, 800, 500],
  "FX-KIT-GARDEN": [0, 400, 800, 500],
  "HOM-53076": [400, 0, 800, 500],
};

const SKUS = Object.keys({ ...REUSE, ...CROPS });

async function cropHero(sku, region) {
  const meta = await sharp(HERO).metadata();
  const w = meta.width ?? 1600;
  const h = meta.height ?? 900;
  const [l, t, cw, ch] = region;
  const left = Math.round((l / 1600) * w);
  const top = Math.round((t / 900) * h);
  const width = Math.round((cw / 1600) * w);
  const height = Math.round((ch / 900) * h);
  const dest = path.join(OUT, `${sku}.jpg`);
  await mkdir(OUT, { recursive: true });
  const buf = await sharp(HERO).extract({ left, top, width, height }).resize(800, 800, { fit: "cover" }).jpeg({ quality: 88 }).toBuffer();
  await writeFile(dest, buf);
  const outMeta = await sharp(buf).metadata();
  return {
    path: `/stores/products/fixmonger/${sku}.jpg`,
    width: outMeta.width ?? 800,
    height: outMeta.height ?? 800,
    alt: `Fixmonger ${sku} product photo`,
  };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  for (const sku of SKUS) {
    const key = `fixmonger:${sku}`;
    if (REUSE[sku]) {
      const source = manifest[`jinglefold:${REUSE[sku]}`];
      if (source) {
        manifest[key] = {
          ...source,
          gallery: source.gallery.map((img) => ({
            ...img,
            path: img.path.replace("/jinglefold/", "/fixmonger/").replace(`/${REUSE[sku]}`, `/${sku}`),
            alt: `Fixmonger ${sku} — ${img.alt}`,
          })),
          source: `reuse:jinglefold:${REUSE[sku]}`,
        };
        const mainImg = source.main;
        const srcPath = path.join(ROOT, "public", mainImg.path.replace(/^\//, ""));
        const destPath = path.join(OUT, `${sku}.jpg`);
        await mkdir(OUT, { recursive: true });
        await writeFile(destPath, await readFile(srcPath));
        for (let i = 1; i < source.gallery.length; i++) {
          const g = source.gallery[i];
          const sp = path.join(ROOT, "public", g.path.replace(/^\//, ""));
          const suffix = g.path.includes("-") ? g.path.split("/").pop() : `${sku}-${i + 1}.jpg`;
          await writeFile(path.join(OUT, suffix.replace(REUSE[sku], sku)), await readFile(sp)).catch(() => undefined);
        }
        console.log("reuse", sku);
        continue;
      }
    }
    if (CROPS[sku]) {
      const imageMeta = await cropHero(sku, CROPS[sku]);
      manifest[key] = { main: imageMeta, gallery: [imageMeta], source: "hero-crop:fixmonger/hero.jpg" };
      console.log("crop", sku);
    }
  }
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

main();

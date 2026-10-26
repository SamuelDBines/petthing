/**
 * Downloads main + gallery images from Go Dropship product pages into public/stores/products/.
 * Usage: node scripts/fetch-godropship-images.mjs
 */
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public/stores/products");
const MANIFEST_PATH = path.join(ROOT, "config/catalogue/product-images.manifest.json");

const UPLOAD_RE =
  /https:\/\/www\.godropship\.co\.uk\/uploadfile\/images\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi;

async function imagesFromPage(pageUrl) {
  const res = await fetch(pageUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; BishopCoCatalogue/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pageUrl}`);
  const html = await res.text();
  const urls = [...new Set((html.match(UPLOAD_RE) ?? []).map((u) => u.replace(/&amp;/g, "&")))];
  return urls.filter((u) => !u.includes("thumbnail_") || urls.length === 1).slice(0, 6);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  const meta = await sharp(buf).metadata();
  return { bytes: buf.length, width: meta.width ?? 0, height: meta.height ?? 0 };
}

async function fromJsonl(file, store) {
  const lines = (await readFile(file, "utf8")).trim().split("\n").filter(Boolean);
  const items = [];
  for (const line of lines) {
    const row = JSON.parse(line);
    const pageUrl = row[0];
    const sku = row[2]?.[0];
    if (!pageUrl || !sku) continue;
    items.push({ store, sku, pageUrl });
  }
  return items;
}

async function fromPricing(storeName, storeSlug) {
  const seed = JSON.parse(await readFile(path.join(ROOT, "config/catalogue/pricing.seed.json"), "utf8"));
  return seed.skus
    .filter(
      (row) =>
        row.store === storeName &&
        typeof row.url === "string" &&
        row.url.includes("godropship.co.uk/") &&
        row.url.length > 45,
    )
    .map((row) => ({ store: storeSlug, sku: row.sku, pageUrl: row.url }));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    manifest = {};
  }

  const jsonlPath = path.join(ROOT, "uploads/xmas_info_d3ab.jsonl");
  const sources = [
    ...(await fromJsonl(jsonlPath).catch(() => [])),
    ...(await fromPricing("Christmas store", "jinglefold")),
  ];
  const unique = new Map();
  for (const item of sources) unique.set(`${item.store}:${item.sku}`, item);

  for (const item of unique.values()) {
    const key = `${item.store}:${item.sku}`;
    try {
      const imgUrls = await imagesFromPage(item.pageUrl);
      if (!imgUrls.length) {
        console.warn("no images", item.sku, item.pageUrl);
        continue;
      }
      const gallery = [];
      for (let i = 0; i < imgUrls.length; i++) {
        const imgUrl = imgUrls[i];
        const ext = imgUrl.includes(".png") ? "png" : "jpg";
        const suffix = i === 0 ? "" : `-${i + 1}`;
        const rel = `/stores/products/${item.store}/${item.sku}${suffix}.${ext}`;
        const dest = path.join(OUT, item.store, `${item.sku}${suffix}.${ext}`);
        await mkdir(path.dirname(dest), { recursive: true });
        const meta = await download(imgUrl, dest);
        gallery.push({ path: rel, ...meta, alt: `${item.sku} product image ${i + 1}` });
        console.log("ok", item.sku, i, meta.bytes);
      }
      manifest[key] = { main: gallery[0], gallery, source: item.pageUrl };
    } catch (error) {
      console.warn("fail", item.sku, error.message);
    }
  }

  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log("manifest entries", Object.keys(manifest).length);
}

main();

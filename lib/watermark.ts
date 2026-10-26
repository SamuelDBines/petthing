import sharp from "sharp";
import { APP_NAME } from "@/config/brand";

export async function watermark(bytes: Buffer) {
  const image = sharp(bytes).rotate().resize({ width: 900, withoutEnlargement: true });
  const meta = await image.metadata();
  const width = meta.width ?? 900;
  const height = meta.height ?? 1200;
  const overlay = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        fill="white" fill-opacity="0.72" font-size="${Math.round(width / 14)}"
        font-family="Georgia, serif" transform="rotate(-18 ${width / 2} ${height / 2})">${APP_NAME}</text>
    </svg>
  `);
  return image.composite([{ input: overlay }]).jpeg({ quality: 78 }).toBuffer();
}

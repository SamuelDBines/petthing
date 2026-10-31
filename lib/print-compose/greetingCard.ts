import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";

async function loadLogo() {
  const logoPath = path.join(process.cwd(), "public", "icon.svg");
  try {
    return await readFile(logoPath);
  } catch {
    return null;
  }
}

/** Full spread: back panel (logo) + front panel (portrait). */
export async function composeGreetingCardSpread(args: { buffer: Buffer; width?: number; height?: number }) {
  const width = args.width ?? 7086;
  const height = args.height ?? 2526;
  const panelWidth = Math.floor(width / 2);
  const front = await sharp(args.buffer)
    .rotate()
    .resize(panelWidth, height, { fit: "cover", position: "centre" })
    .toBuffer();
  const backBase = await sharp({
    create: { width: panelWidth, height, channels: 3, background: { r: 252, g: 250, b: 246 } },
  })
    .jpeg()
    .toBuffer();
  const logo = await loadLogo();
  let back = backBase;
  if (logo) {
    const logoRaster = await sharp(logo).resize(420, 420, { fit: "inside" }).png().toBuffer();
    back = await sharp(backBase)
      .composite([{ input: logoRaster, gravity: "centre" }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }
  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      { input: back, left: 0, top: 0 },
      { input: front, left: panelWidth, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

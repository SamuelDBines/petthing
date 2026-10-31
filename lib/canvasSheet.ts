import sharp from "sharp";

export async function composeCanvasPortrait(args: { buffer: Buffer; widthIn: number; heightIn: number; dpi?: number }) {
  const dpi = args.dpi ?? 300;
  const width = Math.round(args.widthIn * dpi);
  const height = Math.round(args.heightIn * dpi);
  return sharp(args.buffer)
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

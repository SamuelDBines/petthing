import sharp from "sharp";

/** Prodigi 11oz mug wrap — centre portrait with mirrored side panels for handle wrap. */
export async function composeMugWrap(args: { buffer: Buffer; width?: number; height?: number }) {
  const width = args.width ?? 2670;
  const height = args.height ?? 1110;
  const panel = Math.floor(width / 3);
  const portrait = await sharp(args.buffer)
    .rotate()
    .resize(panel, height, { fit: "cover", position: "centre" })
    .toBuffer();
  const meta = await sharp(portrait).metadata();
  const pw = meta.width ?? panel;
  const ph = meta.height ?? height;
  const leftStrip = await sharp(portrait).extract({ left: 0, top: 0, width: Math.min(80, pw), height: ph }).flop().toBuffer();
  const rightStrip = await sharp(portrait)
    .extract({ left: Math.max(0, pw - Math.min(80, pw)), top: 0, width: Math.min(80, pw), height: ph })
    .flop()
    .toBuffer();
  const blurBg = await sharp(args.buffer)
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .blur(18)
    .modulate({ brightness: 0.92 })
    .toBuffer();
  return sharp(blurBg)
    .composite([
      { input: await sharp(leftStrip).resize(panel, height, { fit: "fill" }).toBuffer(), left: 0, top: 0 },
      { input: portrait, left: panel, top: 0 },
      { input: await sharp(rightStrip).resize(panel, height, { fit: "fill" }).toBuffer(), left: panel * 2, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

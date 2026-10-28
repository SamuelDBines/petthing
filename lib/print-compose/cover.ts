import sharp from "sharp";

export async function composeCoverPortrait(args: { buffer: Buffer; width: number; height: number }) {
  return sharp(args.buffer)
    .rotate()
    .resize(args.width, args.height, { fit: "cover", position: "centre" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

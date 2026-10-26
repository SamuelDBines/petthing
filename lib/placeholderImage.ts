import { PNG } from "pngjs";

const PALETTES = [
  [92, 42, 38],
  [196, 90, 34],
  [36, 70, 52],
  [198, 161, 91],
  [70, 48, 84],
  [232, 214, 186],
];

export function paintPlaceholder(variant: number) {
  const width = 768;
  const height = 1024;
  const png = new PNG({ width, height });
  const base = PALETTES[variant % PALETTES.length];
  const cx = width / 2;
  const cy = height * 0.46;
  const rx = 210;
  const ry = 270;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (width * y + x) << 2;
      const fade = y / height;
      png.data[index] = Math.min(255, base[0] * (0.45 + fade * 0.4));
      png.data[index + 1] = Math.min(255, base[1] * (0.4 + (1 - fade) * 0.35));
      png.data[index + 2] = Math.min(255, base[2] * (0.45 + fade * 0.2));
      png.data[index + 3] = 255;
      const oval = (x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2;
      if (oval < 1) {
        png.data[index] = 236;
        png.data[index + 1] = 214;
        png.data[index + 2] = 184;
      }
      if (oval > 0.9 && oval < 1.08) {
        png.data[index] = 212;
        png.data[index + 1] = 168;
        png.data[index + 2] = 84;
      }
    }
  }

  return PNG.sync.write(png);
}

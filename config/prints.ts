export type PrintProductId = "puzzle_252";

export type PrintSheet = "board" | "lid";

export type PrintProduct = {
  id: PrintProductId;
  name: string;
  detail: string;
  /** Customer price. Confirm it covers the Prodigi quote plus UK postage before going live. */
  pricePence: number;
  skuEnv: "PRODIGI_SKU_PUZZLE";
  defaultSku: string;
  copies: number;
  areas: { printArea: "default" | "lid"; sheet: PrintSheet }[];
};

export const PUZZLE_252 = {
  board: { widthMm: 375, heightMm: 285, dpi: 300 },
  lid: { width: 869, height: 674 },
};

export function sheetPixels(sheet: PrintSheet) {
  if (sheet === "lid") return PUZZLE_252.lid;
  return {
    width: Math.round((PUZZLE_252.board.widthMm / 25.4) * PUZZLE_252.board.dpi),
    height: Math.round((PUZZLE_252.board.heightMm / 25.4) * PUZZLE_252.board.dpi),
  };
}

export const PRINTS: PrintProduct[] = [
  {
    id: "puzzle_252",
    name: "252-piece puzzle",
    detail: "Your portrait, kept whole, on a 375×285mm puzzle and on the tin lid. Made in the UK and posted to you.",
    pricePence: 3499,
    skuEnv: "PRODIGI_SKU_PUZZLE",
    defaultSku: "JIGSAW-PUZZLE-252",
    copies: 1,
    areas: [
      { printArea: "default", sheet: "board" },
      { printArea: "lid", sheet: "lid" },
    ],
  },
];

export function getPrint(id: PrintProductId) {
  const product = PRINTS.find((item) => item.id === id);
  if (!product) throw new Error("Unknown print");
  return product;
}

export function printName(id: string) {
  return PRINTS.find((item) => item.id === id)?.name ?? "Print";
}

export function printSku(product: PrintProduct) {
  return process.env[product.skuEnv] || product.defaultSku;
}

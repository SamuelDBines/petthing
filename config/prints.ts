import { PAWTRAITRY_SKU_BY_PRINT_ID, pawtraitryPrintPricePence, type PawtraitryPrintId } from "@/config/catalogue/pawtraitry-skus";
import { CANVAS_PRINTS, canvasPrintIds } from "@/config/canvasPrints";

export type PrintProductId = PawtraitryPrintId;

export type PrintSheet = "board" | "lid" | "canvas";

export type PrintProduct = {
  id: PrintProductId;
  name: string;
  detail: string;
  /** Customer price (UK delivery included in price for Pawtraitry prints). */
  pricePence: number;
  skuEnv: string;
  defaultSku: string;
  copies: number;
  widthIn?: number;
  heightIn?: number;
  prodigiPrintArea?: string;
  areas: { printArea: string; sheet: PrintSheet }[];
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

const PUZZLE_PRINTS: PrintProduct[] = [
  {
    id: "puzzle_252",
    name: "252-piece puzzle",
    detail: "Your portrait, kept whole, on a 375×285mm puzzle and on the tin lid. UK delivery included in the price.",
    pricePence: pawtraitryPrintPricePence("puzzle_252"),
    skuEnv: "PRODIGI_SKU_PUZZLE",
    defaultSku: "JIGSAW-PUZZLE-252",
    copies: 1,
    areas: [
      { printArea: "default", sheet: "board" },
      { printArea: "lid", sheet: "lid" },
    ],
  },
];

export const PRINTS: PrintProduct[] = [...PUZZLE_PRINTS, ...CANVAS_PRINTS];

export function getPrint(id: PrintProductId) {
  const product = PRINTS.find((item) => item.id === id);
  if (!product) throw new Error("Unknown print");
  return product;
}

export function printName(id: string) {
  return PRINTS.find((item) => item.id === id)?.name ?? "Print";
}

export function allPrintProductIds(): PrintProductId[] {
  return ["puzzle_252", ...canvasPrintIds()] as PrintProductId[];
}

export function printSku(product: PrintProduct) {
  return process.env[product.skuEnv] || product.defaultSku;
}

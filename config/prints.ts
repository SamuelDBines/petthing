import { PAWTRAITRY_SKU_BY_PRINT_ID, pawtraitryPrintPricePence, type PawtraitryPrintId } from "@/config/catalogue/pawtraitry-skus";
import { CANVAS_PRINTS, canvasPrintIds } from "@/config/canvasPrints";
import { PAWTRAITRY_PHYSICAL_PRINTS } from "@/config/pawtraitryPhysicalPrints";

export type PrintProductId = PawtraitryPrintId;

export type PrintComposer =
  | "puzzle_board"
  | "puzzle_lid"
  | "canvas_inches"
  | "cover"
  | "mug_wrap"
  | "greeting_card";

/** @deprecated use composer on PrintAreaSpec */
export type PrintSheet = "board" | "lid" | "canvas";

export type PrintAreaSpec = {
  printArea: string;
  composer: PrintComposer;
  widthPx?: number;
  heightPx?: number;
  /** Legacy puzzle areas */
  sheet?: PrintSheet;
};

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
  /** Prodigi v4 order/quote item attributes (e.g. wrap, color). */
  prodigiAttributes?: Record<string, string>;
  areas: PrintAreaSpec[];
  group?: string;
  previewImage?: string;
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
    group: "puzzle",
    previewImage: "/examples/pet-after.jpg",
    areas: [
      { printArea: "jigsaw", composer: "puzzle_board", sheet: "board" },
      { printArea: "lid", composer: "puzzle_lid", sheet: "lid" },
    ],
  },
];

export const PRINTS: PrintProduct[] = [...PUZZLE_PRINTS, ...CANVAS_PRINTS, ...PAWTRAITRY_PHYSICAL_PRINTS];

export function getPrint(id: PrintProductId) {
  const product = PRINTS.find((item) => item.id === id);
  if (!product) throw new Error("Unknown print");
  return product;
}

export function printName(id: string) {
  return PRINTS.find((item) => item.id === id)?.name ?? "Print";
}

export function allPrintProductIds(): PrintProductId[] {
  return PRINTS.map((p) => p.id);
}

export function printSku(product: PrintProduct) {
  return process.env[product.skuEnv] || product.defaultSku;
}

export const GREETING_CARD_PRINT_ID = "greeting_card_a5" as const;

export function greetingCardPricePence() {
  return pawtraitryPrintPricePence(GREETING_CARD_PRINT_ID);
}

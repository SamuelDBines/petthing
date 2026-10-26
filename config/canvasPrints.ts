import type { PrintProduct } from "@/config/prints";

/** Prodigi global canvas catalogue (sandbox SKUs — override per env). */
export const CANVAS_PRINTS: PrintProduct[] = [
  {
    id: "canvas_slim_12x16",
    name: "Slim canvas 12×16″",
    detail: "Gallery-wrapped slim canvas, ready to hang.",
    pricePence: 4900,
    skuEnv: "PRODIGI_SKU_CANVAS_SLIM_12X16",
    defaultSku: "GLOBAL-SLIMCAN-12X16",
    copies: 1,
    widthIn: 12,
    heightIn: 16,
    prodigiPrintArea: "default",
    areas: [{ printArea: "default", sheet: "canvas" }],
  },
  {
    id: "canvas_stretched_12x16",
    name: "Stretched canvas 12×16″",
    detail: "Classic stretched canvas with deeper frame.",
    pricePence: 5900,
    skuEnv: "PRODIGI_SKU_CANVAS_STRETCHED_12X16",
    defaultSku: "GLOBAL-CAN-12X16",
    copies: 1,
    widthIn: 12,
    heightIn: 16,
    prodigiPrintArea: "default",
    areas: [{ printArea: "default", sheet: "canvas" }],
  },
  {
    id: "canvas_stretched_16x20",
    name: "Stretched canvas 16×20″",
    detail: "Room-filling stretched canvas print.",
    pricePence: 6900,
    skuEnv: "PRODIGI_SKU_CANVAS_STRETCHED_16X20",
    defaultSku: "GLOBAL-CAN-16X20",
    copies: 1,
    widthIn: 16,
    heightIn: 20,
    prodigiPrintArea: "default",
    areas: [{ printArea: "default", sheet: "canvas" }],
  },
  {
    id: "canvas_framed_slim_16x20",
    name: "Framed slim canvas 16×20″",
    detail: "Slim canvas in a classic frame.",
    pricePence: 8900,
    skuEnv: "PRODIGI_SKU_CANVAS_FRA_SLIM_16X20",
    defaultSku: "GLOBAL-FRA-SLIMCAN-16X20",
    copies: 1,
    widthIn: 16,
    heightIn: 20,
    prodigiPrintArea: "default",
    areas: [{ printArea: "default", sheet: "canvas" }],
  },
  {
    id: "canvas_framed_16x20",
    name: "Framed canvas 16×20″",
    detail: "Stretched canvas in a premium frame.",
    pricePence: 8900,
    skuEnv: "PRODIGI_SKU_CANVAS_FRA_16X20",
    defaultSku: "GLOBAL-FRA-CAN-16X20",
    copies: 1,
    widthIn: 16,
    heightIn: 20,
    prodigiPrintArea: "default",
    areas: [{ printArea: "default", sheet: "canvas" }],
  },
];

export function canvasPrintIds() {
  return CANVAS_PRINTS.map((p) => p.id);
}

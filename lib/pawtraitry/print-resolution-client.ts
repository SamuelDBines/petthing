import type { PrintAreaSpec, PrintProduct } from "@/config/prints";
import { portraitMeetsPrintMinimum } from "@/lib/print-compose/resolution-gate";

export function printTargetPixels(area: PrintAreaSpec, product: PrintProduct) {
  if (area.widthPx && area.heightPx) return { width: area.widthPx, height: area.heightPx };
  if (area.composer === "canvas_inches" && product.widthIn && product.heightIn) {
    return { width: Math.round(product.widthIn * 300), height: Math.round(product.heightIn * 300) };
  }
  return null;
}

export function productMeetsGuaranteedPortrait(product: PrintProduct, sourceWidth: number, sourceHeight: number) {
  for (const area of product.areas) {
    const target = printTargetPixels(area, product);
    if (!target) continue;
    if (!portraitMeetsPrintMinimum(sourceWidth, sourceHeight, target.width, target.height)) return false;
  }
  return true;
}

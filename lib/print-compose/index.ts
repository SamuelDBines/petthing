import { composeCanvasPortrait } from "@/lib/canvasSheet";
import type { PrintAreaSpec, PrintProduct } from "@/config/prints";
import { composePrint } from "@/lib/puzzleSheet";
import { composeCoverPortrait } from "@/lib/print-compose/cover";
import { composeGreetingCardSpread } from "@/lib/print-compose/greetingCard";
import { composeMugWrap } from "@/lib/print-compose/mugWrap";

export async function composePrintArea(product: PrintProduct, area: PrintAreaSpec, portrait: Buffer) {
  switch (area.composer) {
    case "puzzle_board":
      return composePrint(portrait, "board");
    case "puzzle_lid":
      return composePrint(portrait, "lid");
    case "canvas_inches":
      return composeCanvasPortrait({
        buffer: portrait,
        widthIn: product.widthIn ?? 12,
        heightIn: product.heightIn ?? 16,
      });
    case "cover":
      return composeCoverPortrait({
        buffer: portrait,
        width: area.widthPx ?? 1000,
        height: area.heightPx ?? 1000,
      });
    case "mug_wrap":
      return composeMugWrap({
        buffer: portrait,
        width: area.widthPx ?? 2670,
        height: area.heightPx ?? 1110,
      });
    case "greeting_card":
      return composeGreetingCardSpread({
        buffer: portrait,
        width: area.widthPx ?? 7086,
        height: area.heightPx ?? 2526,
      });
    default:
      throw new Error(`Unknown print composer ${(area as PrintAreaSpec).composer}`);
  }
}

export function printAreaTargetPixels(area: PrintAreaSpec, product: PrintProduct) {
  if (area.widthPx && area.heightPx) return { width: area.widthPx, height: area.heightPx };
  if (area.composer === "canvas_inches" && product.widthIn && product.heightIn) {
    return { width: Math.round(product.widthIn * 300), height: Math.round(product.heightIn * 300) };
  }
  return null;
}

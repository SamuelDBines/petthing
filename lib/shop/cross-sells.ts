import type { CatalogueProduct } from "@/lib/catalogue/types";

const KIT_HINTS: Record<string, string[]> = {
  "hom-76459": ["fx-kit-door", "hom-76454"],
  "car-46787": ["fx-kit-car", "ab6701", "hom-74935"],
  "hom-56098": ["fx-kit-garden", "hom-55115"],
  "gem-76745": ["xm-kit-tree", "gem-76752"],
};

export function crossSellProducts(product: CatalogueProduct, all: CatalogueProduct[], limit = 3) {
  const hints = KIT_HINTS[product.id] ?? [];
  const hinted = hints.map((id) => all.find((p) => p.id === id)).filter(Boolean) as CatalogueProduct[];
  const sameCategory = all.filter((p) => p.id !== product.id && p.category === product.category);
  const bundles = all.filter((p) => p.kind === "bundle" && p.id !== product.id);
  const merged = [...hinted, ...bundles, ...sameCategory];
  const seen = new Set<string>();
  const out: CatalogueProduct[] = [];
  for (const p of merged) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

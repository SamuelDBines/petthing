import { FIXMONGER_SEED_PRODUCTS } from "@/config/catalogue/fixmonger-seed";
import { JINGLEFOLD_DECOR_PRODUCTS } from "@/config/catalogue/jinglefold-seed";

const SEED = {
  fixmonger: FIXMONGER_SEED_PRODUCTS,
  jinglefold: JINGLEFOLD_DECOR_PRODUCTS,
} as const;

function activeSlugSet(storeId: string): Set<string> | null {
  const products = SEED[storeId as keyof typeof SEED];
  if (!products) return null;
  return new Set(products.filter((p) => p.active).map((p) => p.slug));
}

/** Edge-safe catalogue PDP slug check (seed truth; DB overrides may differ until revalidate). */
export function catalogueProductSlugExists(storeId: string, slug: string) {
  const set = activeSlugSet(storeId);
  if (!set) return true;
  return set.has(slug);
}

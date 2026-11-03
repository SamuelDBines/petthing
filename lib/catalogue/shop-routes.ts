/**
 * Reserved path segments under /shop (sibling routes of app/shop/[slug]).
 * Keep in sync with directories in app/shop/.
 */
export const SHOP_RESERVED_SEGMENTS = new Set(["cart", "success"]);

export function isShopReservedSegment(segment: string) {
  return SHOP_RESERVED_SEGMENTS.has(segment.toLowerCase());
}

export function should404UnknownShopProduct(storeId: string, segment: string, productExists: boolean) {
  if (isShopReservedSegment(segment)) return false;
  if (productExists) return false;
  return true;
}

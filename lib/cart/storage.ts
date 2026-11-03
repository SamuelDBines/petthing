import type { ShopCartLine } from "@/lib/catalogue/types";

const KEY = "ps_shop_cart";

export function readCart(): ShopCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ShopCartLine[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: ShopCartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
}

export function addToCart(productId: string, quantity = 1) {
  const cart = readCart();
  const existing = cart.find((line) => line.productId === productId);
  if (existing) existing.quantity += quantity;
  else cart.push({ productId, quantity });
  writeCart(cart);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ps-cart-updated"));
  }
  return cart;
}

export function subscribeCart(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener("ps-cart-updated", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("ps-cart-updated", handler);
    window.removeEventListener("storage", handler);
  };
}

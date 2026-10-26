export type CatalogueSupplier = "go_dropship" | "cj";

export type CatalogueBundleComponent = {
  supplierSku: string;
  quantity: number;
  costPence: number;
  label: string;
};

export type CatalogueProduct = {
  id: string;
  storeId: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  supplier: CatalogueSupplier;
  supplierSku: string;
  costPence: number;
  pricePence: number;
  compareAtPricePence?: number | null;
  kind?: "standard" | "bundle";
  bundleComponents?: CatalogueBundleComponent[];
  stock: number;
  images: string[];
  variants: { id: string; name: string; pricePence?: number; stock?: number }[];
  active: boolean;
};

export type StorefrontCatalogueProduct = Omit<CatalogueProduct, "costPence" | "bundleComponents">;

export type ShopCartLine = {
  productId: string;
  quantity: number;
  variantId?: string;
};

export type ShopOrderStatus =
  | "pending_payment"
  | "paid"
  | "submitted_to_supplier"
  | "shipped"
  | "delivered"
  | "refunded";

export type ShopOrderLine = {
  productId: string;
  name: string;
  supplierSku: string;
  supplier: CatalogueSupplier;
  quantity: number;
  unitPricePence: number;
  costPence: number;
};

export type ShopOrder = {
  id: string;
  storeId: string;
  email: string;
  status: ShopOrderStatus;
  lines: ShopOrderLine[];
  shipping: {
    name: string;
    line1: string;
    line2: string;
    city: string;
    postalCode: string;
    countryCode: string;
  } | null;
  amountPence: number;
  shippingPence: number;
  stripeCheckoutSessionId: string | null;
  trackingNumber: string | null;
  supplierBatchId: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type SupplierBatchExport = {
  id: string;
  storeId: string;
  supplier: CatalogueSupplier;
  orderIds: string[];
  csv: string;
  createdAt: string;
  submittedAt: string | null;
};

export type MetaCheckoutAttribution = {
  purchaseEventId: string;
  initiateCheckoutEventId?: string;
  marketingConsent: boolean;
  fbp?: string;
  fbc?: string;
};

export type MetaStandardEvent =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Lead"
  | "Purchase";

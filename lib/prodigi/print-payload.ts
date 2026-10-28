import { prodigiItemAttributes } from "@/config/prodigi-print-attributes";
import { printSku, type PrintProduct } from "@/config/prints";

export type ProdigiQuoteLineItem = {
  sku: string;
  copies: number;
  attributes: Record<string, string>;
  assets: { printArea: string }[];
};

export type ProdigiOrderLineItem = {
  sku: string;
  copies: number;
  sizing: "fillPrintArea";
  merchantReference: string;
  attributes: Record<string, string>;
  assets: { printArea: string; url: string }[];
};

export type ProdigiProductDetails = {
  sku: string;
  attributes: Record<string, string[]>;
  printAreas: string[];
};

export function singleValueAttributesFromDetails(details: ProdigiProductDetails): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, allowed] of Object.entries(details.attributes)) {
    if (allowed.length === 1) out[name] = allowed[0]!;
  }
  return out;
}

export function isMultiValueProdigiAttribute(allowed: string[]) {
  return allowed.length > 1;
}

export function buildProdigiQuoteLineItem(product: PrintProduct, copies = product.copies): ProdigiQuoteLineItem {
  return {
    sku: printSku(product),
    copies,
    attributes: prodigiItemAttributes(product),
    assets: product.areas.map((area) => ({ printArea: area.printArea })),
  };
}

export function buildProdigiOrderLineItem(args: {
  product: PrintProduct;
  assets: { printArea: string; url: string }[];
  merchantReference: string;
}): ProdigiOrderLineItem {
  return {
    sku: printSku(args.product),
    copies: args.product.copies,
    sizing: "fillPrintArea",
    merchantReference: args.merchantReference,
    attributes: prodigiItemAttributes(args.product),
    assets: args.assets.map((asset) => ({ printArea: asset.printArea, url: asset.url })),
  };
}

export function parseProdigiProductDetails(payload: unknown): ProdigiProductDetails | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { product?: Record<string, unknown> };
  const product = root.product;
  if (!product || typeof product !== "object") return null;
  const sku = typeof product.sku === "string" ? product.sku : "";
  const attributesRaw = product.attributes;
  const attributes: Record<string, string[]> = {};
  if (attributesRaw && typeof attributesRaw === "object") {
    for (const [key, value] of Object.entries(attributesRaw as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        attributes[key] = value.filter((row): row is string => typeof row === "string");
      }
    }
  }
  const printAreasRaw = product.printAreas;
  const printAreas =
    printAreasRaw && typeof printAreasRaw === "object"
      ? Object.keys(printAreasRaw as Record<string, unknown>)
      : [];
  if (!sku) return null;
  return { sku, attributes, printAreas };
}

export function validateStaticImplicitAgainstProductDetails(
  defaultSku: string,
  _resolvedSku: string,
  details: ProdigiProductDetails,
  staticImplicit: Record<string, string>,
): string[] {
  const errors: string[] = [];
  for (const [name, actual] of Object.entries(staticImplicit)) {
    const allowed = details.attributes[name];
    if (!allowed?.length) {
      errors.push(`${defaultSku}: static implicit ${name} is not on Prodigi product ${details.sku}`);
      continue;
    }
    if (!allowed.includes(actual)) {
      errors.push(
        `${defaultSku}: static implicit ${name}=${JSON.stringify(actual)} not in Prodigi [${allowed.join(", ")}]`,
      );
    }
  }
  return errors;
}

export function validateProdigiLineItemAgainstProduct(
  item: ProdigiQuoteLineItem,
  details: ProdigiProductDetails,
): string[] {
  const errors: string[] = [];
  for (const [name, allowed] of Object.entries(details.attributes)) {
    if (!allowed.length || !isMultiValueProdigiAttribute(allowed)) continue;
    const value = item.attributes[name];
    if (!value) {
      errors.push(`${details.sku}: missing required attribute ${name} (validValues: ${allowed.join(", ")})`);
      continue;
    }
    if (!allowed.includes(value)) {
      errors.push(`${details.sku}: attribute ${name}=${value} not in [${allowed.join(", ")}]`);
    }
  }
  for (const asset of item.assets) {
    if (!details.printAreas.includes(asset.printArea)) {
      errors.push(`${details.sku}: print area ${asset.printArea} not in [${details.printAreas.join(", ")}]`);
    }
  }
  return errors;
}

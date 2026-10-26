import type { GpsrInfo } from "@/lib/catalogue/types";

const GO_DROPSHIP: GpsrInfo = {
  manufacturerName: "Go Dropship UK (supplier)",
  manufacturerAddress: "United Kingdom — confirm full address in admin",
  responsiblePersonName: "Bishop Co Tech Limited",
  responsiblePersonAddress: "England and Wales — registered office on site footer",
  needsConfirming: true,
};

const PRODIGI: GpsrInfo = {
  manufacturerName: "Prodigi UK",
  manufacturerAddress: "UK print-on-demand fulfilment",
  responsiblePersonName: "Bishop Co Tech Limited",
  responsiblePersonAddress: "England and Wales — registered office on site footer",
  needsConfirming: true,
};

const PRINTFUL: GpsrInfo = {
  manufacturerName: "Printful (UK fulfilment)",
  manufacturerAddress: "UK fulfilment partner",
  responsiblePersonName: "Bishop Co Tech Limited",
  responsiblePersonAddress: "England and Wales — registered office on site footer",
  needsConfirming: true,
};

export function gpsrForSupplier(supplier: "go_dropship" | "prodigi" | "printful", overrides?: Partial<GpsrInfo>): GpsrInfo {
  const base = supplier === "go_dropship" ? GO_DROPSHIP : supplier === "printful" ? PRINTFUL : PRODIGI;
  return { ...base, ...overrides };
}

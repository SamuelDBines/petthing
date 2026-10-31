import type { GpsrInfo } from "@/lib/catalogue/types";
import { GPSR_RESPONSIBLE_PERSON } from "@/config/gpsr-responsible-person";

const RP = {
  responsiblePersonName: GPSR_RESPONSIBLE_PERSON.name,
  responsiblePersonAddress: GPSR_RESPONSIBLE_PERSON.address,
};

const GO_DROPSHIP: GpsrInfo = {
  manufacturerName: "As labelled on product packaging (Go Dropship UK supplier)",
  manufacturerAddress: "United Kingdom. See product label",
  ...RP,
  needsConfirming: false,
};

const PRODIGI: GpsrInfo = {
  manufacturerName: "Prodigi UK (print fulfilment partner)",
  manufacturerAddress: "United Kingdom. See order packing slip",
  ...RP,
  needsConfirming: false,
};

const PRINTFUL: GpsrInfo = {
  manufacturerName: "Printful (UK fulfilment partner)",
  manufacturerAddress: "United Kingdom. See order packing slip",
  ...RP,
  needsConfirming: false,
};

export function gpsrForSupplier(supplier: "go_dropship" | "prodigi" | "printful", overrides?: Partial<GpsrInfo>): GpsrInfo {
  const base = supplier === "go_dropship" ? GO_DROPSHIP : supplier === "printful" ? PRINTFUL : PRODIGI;
  return { ...base, ...overrides };
}

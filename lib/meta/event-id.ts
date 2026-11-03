import { randomUUID } from "crypto";

export function newMetaEventId(prefix?: string) {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

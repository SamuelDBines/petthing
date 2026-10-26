import os from "os";
import path from "path";

/** Local uploads, JSON DB, and outbox — outside the repo so Turbopack does not reload on every write. */
export function localDataRoot() {
  const configured = process.env.LOCAL_DATA_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(os.homedir(), ".pawtraitry-local");
}

export function localDataPath(...segments: string[]) {
  return path.join(localDataRoot(), ...segments);
}

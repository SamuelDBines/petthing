export function parseFromHeader(from: string) {
  const trimmed = from.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  return { name: undefined, email: trimmed };
}

export function formatFromHeader(name: string, email: string) {
  const safeName = name.replace(/"/g, "'");
  return `${safeName} <${email}>`;
}

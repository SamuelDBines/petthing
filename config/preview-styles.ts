import type { StyleDefinition, ThemeDefinition } from "@/config/themes";

/** Theme id stored on free-preview orders. Not a seasonal sale theme. */
export const STUDIO_THEME_ID = "studio";

/** Style ids for the two free-form options. */
export const CUSTOM_STYLE_ID = "custom";
export const IMPROVE_STYLE_ID = "improve";

export type PreviewStyle = StyleDefinition & { group: "timeless" | "seasonal" | "yours" };

export const PREVIEW_STYLES: PreviewStyle[] = [
  { id: "oil-painting", name: "Oil painting", blurb: "Rich brushstrokes and a warm varnish glow.", thumbnail: "", swatch: "#5c4033", group: "timeless" },
  { id: "watercolour", name: "Watercolour", blurb: "Soft washes on textured paper.", thumbnail: "", swatch: "#6a8fa8", group: "timeless" },
  { id: "renaissance", name: "Renaissance", blurb: "A grand old-master portrait in velvet and gold.", thumbnail: "", swatch: "#7a3b2e", group: "timeless" },
  { id: "royal-portrait", name: "Royal portrait", blurb: "Crown, cape and a palace backdrop.", thumbnail: "", swatch: "#4b2c6b", group: "timeless" },
  { id: "cartoon", name: "Cartoon", blurb: "Bright, friendly, hand-drawn animation look.", thumbnail: "", swatch: "#f2a541", group: "timeless" },
  { id: "pop-art", name: "Pop art", blurb: "Bold colour blocks and halftone dots.", thumbnail: "", swatch: "#e63973", group: "timeless" },
  { id: "charcoal-sketch", name: "Charcoal sketch", blurb: "Dramatic monochrome shading.", thumbnail: "", swatch: "#3a3a3a", group: "timeless" },
  { id: "line-art", name: "Minimal line art", blurb: "Clean single-line drawing, great on mugs.", thumbnail: "", swatch: "#d9cbb5", group: "timeless" },
  { id: "storybook", name: "Halloween storybook", blurb: "A friendly spooky picture-book scene.", thumbnail: "/examples/style-storybook.jpg", swatch: "#e07a2f", group: "seasonal" },
  { id: "snow-window", name: "Christmas snow window", blurb: "Snowfall, fairy lights and a cosy window.", thumbnail: "", swatch: "#2f5d50", group: "seasonal" },
  { id: IMPROVE_STYLE_ID, name: "Improve my photo", blurb: "Better light, colour and sharpness. Still a photo.", thumbnail: "", swatch: "#9fb7a2", group: "yours" },
  { id: CUSTOM_STYLE_ID, name: "Describe your own", blurb: "Type what you want, for example 'astronaut on the moon'.", thumbnail: "", swatch: "#c9a227", group: "yours" },
];

export const STUDIO_THEME: ThemeDefinition = {
  id: STUDIO_THEME_ID,
  name: "Pawtraitry styles",
  startsOn: "2026-01-01",
  endsOn: "2099-12-31",
  deadlineIso: "2099-12-31T23:59:00.000Z",
  deadlineLabel: "",
  heroTitle: "Your pet, in any style.",
  heroBody: "Try styles for free, then order the files or a gift.",
  styles: PREVIEW_STYLES.map(({ group: _group, ...style }) => style),
};

export function previewStyleById(id: string) {
  return PREVIEW_STYLES.find((style) => style.id === id) ?? null;
}

const CUSTOM_BLOCKED = /\b(nude|naked|nsfw|sex|sexual|porn|gore|blood|kill|weapon|gun|knife|drugs?|nazi)\b/i;

/** Clean a customer-typed prompt. Returns null when it is empty or not allowed. */
export function cleanCustomPrompt(raw: string | undefined | null, banned: string[] = []) {
  const text = (raw ?? "").replace(/[\u0000-\u001f<>{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  if (text.length < 3) return null;
  if (CUSTOM_BLOCKED.test(text)) return null;
  const lower = text.toLowerCase();
  if (banned.some((word) => lower.includes(word))) return null;
  return text;
}

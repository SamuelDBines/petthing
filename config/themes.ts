export type SubjectType = "pet" | "family" | "couple" | "me";

export type StyleDefinition = {
  id: string;
  name: string;
  blurb: string;
  /** Optional image in /public. Empty until you drop in a real thumbnail. */
  thumbnail: string;
  swatch: string;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  deadlineIso: string;
  deadlineLabel: string;
  heroTitle: string;
  heroBody: string;
  styles: StyleDefinition[];
};

export const SUBJECTS: { id: SubjectType; label: string; hint: string }[] = [
  { id: "pet", label: "Pet", hint: "Dogs, cats, and the others who run the house." },
  { id: "family", label: "Family / group", hint: "Everyone who should be in the picture, children included." },
  { id: "couple", label: "Couple", hint: "Two people, both easy to see." },
  { id: "me", label: "Just me", hint: "One person, face clear." },
];

export const THEMES: ThemeDefinition[] = [
  {
    id: "halloween",
    name: "Halloween",
    startsOn: "2026-09-01",
    endsOn: "2026-10-31",
    deadlineIso: "2026-10-31T23:59:00.000Z",
    deadlineLabel: "Delivered before Halloween",
    heroTitle: "Your photo, dressed for Halloween.",
    heroBody:
      "Send a few snaps of the pet, the kids, or the two of you. We paint family-friendly seasonal portraits and cards: recognisable faces, no spooky surprises, ready before 31 October.",
    styles: [
      {
        id: "victorian-portrait",
        name: "Victorian haunted portrait",
        blurb: "Oil-paint light, a gilded frame, and a candlelit parlour.",
        thumbnail: "/examples/pet-after.jpg",
        swatch: "#6d2e2a",
      },
      {
        id: "friendly-vampires",
        name: "Friendly vampire family",
        blurb: "Velvet cloaks, tiny fangs, and a grin rather than a fright.",
        thumbnail: "/examples/style-vampires.jpg",
        swatch: "#4a2744",
      },
      {
        id: "witch-familiar",
        name: "Witch and familiar",
        blurb: "Lantern light, a pointed hat, and the pet as the star.",
        thumbnail: "/examples/style-witch.jpg",
        swatch: "#2d4634",
      },
      {
        id: "pumpkin-dusk",
        name: "Pumpkin patch at dusk",
        blurb: "Hay bales, lanterns, and a purple evening sky.",
        thumbnail: "/examples/couple-after.jpg",
        swatch: "#c45a22",
      },
      {
        id: "storybook",
        name: "Cosy spooky storybook",
        blurb: "Soft gouache, smiling sheet-ghosts, and a picture-book hush.",
        thumbnail: "/examples/style-storybook.jpg",
        swatch: "#d7b56d",
      },
      {
        id: "skeleton-dance",
        name: "Skeleton dance party",
        blurb: "Cartoon bones, string lights, and a costume painted on clothes.",
        thumbnail: "/examples/style-skeleton.jpg",
        swatch: "#ece4d4",
      },
    ],
  },
  {
    id: "christmas",
    name: "Christmas",
    startsOn: "2026-11-01",
    endsOn: "2026-12-24",
    deadlineIso: "2026-12-24T17:00:00.000Z",
    deadlineLabel: "Ready for Christmas Eve",
    heroTitle: "The same faces, now in the Christmas set.",
    heroBody:
      "Christmas portraits open on 1 November. Pre-order and we start from the photos you already trust us with, or send new ones when the theme opens.",
    styles: [
      {
        id: "snow-window",
        name: "Snowy window portrait",
        blurb: "Frost on the glass, wool coats, and a quiet street outside.",
        thumbnail: "",
        swatch: "#7f97a8",
      },
      {
        id: "jumper-evening",
        name: "Cosy jumper evening",
        blurb: "Fair-isle knits, paper chains, and lamplight.",
        thumbnail: "",
        swatch: "#8f3d3a",
      },
      {
        id: "candlelit-carols",
        name: "Candlelit carols",
        blurb: "An original parlour scene with candles and sheet music, no branded shows.",
        thumbnail: "",
        swatch: "#c9a15a",
      },
      {
        id: "winter-forest",
        name: "Winter forest walk",
        blurb: "Scarves, pine trees, and a low winter sun.",
        thumbnail: "",
        swatch: "#2c4638",
      },
      {
        id: "eve-storybook",
        name: "Christmas Eve storybook",
        blurb: "Gouache stockings, cocoa, and a picture-book living room.",
        thumbnail: "",
        swatch: "#d4573a",
      },
      {
        id: "fireside-knit",
        name: "Fireside knit",
        blurb: "A painted portrait beside the hearth, stockings included.",
        thumbnail: "",
        swatch: "#6a3a2a",
      },
    ],
  },
  {
    id: "painted-canvas",
    name: "Painted canvas",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    deadlineIso: "2026-12-14T23:59:00.000Z",
    deadlineLabel: "Canvas prints in time for Christmas",
    heroTitle: "Your pet as a painted canvas.",
    heroBody:
      "Choose oil, watercolour, or charcoal. We paint from your photos, then you can order a Prodigi canvas print in the size you want.",
    styles: [
      {
        id: "oil-painting",
        name: "Oil painting",
        blurb: "Rich brushstrokes, warm varnish glow, gallery depth.",
        thumbnail: "/examples/pet-after.jpg",
        swatch: "#5c4033",
      },
      {
        id: "watercolour",
        name: "Watercolour",
        blurb: "Soft washes, paper texture, gentle edges.",
        thumbnail: "/examples/couple-after.jpg",
        swatch: "#6a8fa8",
      },
      {
        id: "charcoal-sketch",
        name: "Charcoal sketch",
        blurb: "Dramatic monochrome shading with paper grain.",
        thumbnail: "/examples/pet-before.jpg",
        swatch: "#3a3a3a",
      },
    ],
  },
];

export function getTheme(id: string) {
  if (id === "studio") {
    // Lazy require avoids a circular import (preview-styles imports types from here).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("@/config/preview-styles") as typeof import("@/config/preview-styles")).STUDIO_THEME;
  }
  return THEMES.find((theme) => theme.id === id) ?? null;
}

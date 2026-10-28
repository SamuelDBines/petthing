import { PAINTED_STYLE_IDS } from "@/config/paintings";
import { THEMES, type SubjectType } from "@/config/themes";
import { BUILTIN_STORES } from "@/lib/tenant/defaults";

const BANNED = [
  "disney",
  "marvel",
  "pixar",
  "harry potter",
  "nintendo",
  "pokemon",
  "pokémon",
  "barbie",
  "hello kitty",
  "mickey",
  "elsa",
  "batman",
  "ghibli",
  "star wars",
  "hogwarts",
  "minion",
];

export type StylePrompt = {
  template: string;
  negative: string;
};

const SUBJECT_LINES: Record<SubjectType, string> = {
  pet: "the same pet from the reference photos, with the same face, markings, and fur",
  family: "the same family group from the reference photos, every person included and recognisable",
  couple: "the same couple from the reference photos, both people recognisable",
  me: "the same person from the reference photos, face and features recognisable",
};

const BASE_NEGATIVE = [
  "nudity",
  "nude",
  "sexual content",
  "lingerie",
  "cleavage",
  "gore",
  "blood",
  "violence",
  "injury",
  "wounds",
  "weapons",
  "knives",
  "horror",
  "scary",
  "creepy",
  "corpse",
  "realistic exposed bones",
  "brand logo",
  "trademark",
  "celebrity",
  "famous person",
  "watermark",
  "caption text",
  "extra limbs",
  "deformed face",
].join(", ");

const FAMILY_NEGATIVE = [
  "scary children",
  "crying child",
  "horror makeup",
  "occult symbols",
  "pentagram",
  "demons",
  "monsters",
  "threatening pose",
  "dark ritual",
].join(", ");

export const STYLE_PROMPTS: Record<string, StylePrompt> = {
  "victorian-portrait": {
    template:
      "Paint {subject} as an original Victorian parlour portrait in oil. Dark emerald background, warm candlelight, lace and velvet costume, a gilded oval frame painted into the picture. Elegant and only mildly eerie. Fully clothed. No film still, no existing character.",
    negative: "modern clothing, photograph, logo",
  },
  "friendly-vampires": {
    template:
      "Paint {subject} as a friendly vampire household in an original costume portrait. Velvet cloaks over full outfits, tiny decorative fangs, warm smiles, a candlelit parlour, distant bat silhouettes. Playful, wholesome, and fully clothed, never frightening or gory.",
    negative: "blood, fangs biting, pale corpse, horror movie",
  },
  "witch-familiar": {
    template:
      "Paint {subject} as an original witch-and-familiar portrait. Pointed hats, wool cloaks, a brass lantern, herbs, and a moon in the window. If a pet is in the references, keep that pet recognisable as the familiar. Fully clothed, kindly, cosy.",
    negative: "broom violence, cauldron of blood, scary witch",
  },
  "pumpkin-dusk": {
    template:
      "Place {subject} in an original pumpkin patch at dusk. Orange lanterns, hay bales, purple sky, knitted scarves, and boots where the subject is a person. Cheerful autumn evening, fully clothed, no jump-scare.",
    negative: "carved screaming faces, fire, darkness hiding the subject",
  },
  storybook: {
    template:
      "Illustrate {subject} as an original cosy spooky storybook page in soft gouache. Rounded shapes, friendly bedsheet ghosts with smiles, teacups, autumn leaves, picture-book lighting. Suitable for a children's book. Fully clothed.",
    negative: "photoreal horror, sharp teeth, threatening ghost",
  },
  "skeleton-dance": {
    template:
      "Draw {subject} at an original cartoon skeleton dance party. People wear a skeleton costume painted over their clothes. Pets may wear a tiny painted costume. Cheerful cartoon skeletons dance nearby under string lights. Bright, funny, and not gory. No exposed organs.",
    negative: "gore, anatomy, realistic skull, grave, injury",
  },
  "snow-window": {
    template:
      "Paint {subject} beside a snowy window in an original winter portrait. Wool coats or a festive knit, frost on the glass, warm interior light, a quiet street outside. Fully clothed, calm, and recognisable.",
    negative: "branded characters, logos, horror",
  },
  "jumper-evening": {
    template:
      "Paint {subject} in a cosy jumper evening. Original fair-isle knits, paper chains, lamplight, mugs of cocoa. Fully clothed, warm, and intimate without being revealing.",
    negative: "logos, brand patterns, text on clothing",
  },
  "candlelit-carols": {
    template:
      "Paint {subject} in an original candlelit parlour with sheet music and evergreen on the mantel. Soft singing atmosphere, velvet and wool, golden candles, fully clothed. No reference to any film, ballet, or branded concert.",
    negative: "logos, famous costumes, text",
  },
  "winter-forest": {
    template:
      "Place {subject} on a winter forest walk. Pine trees, a low sun, scarves, boots, and snow that does not hide faces or the pet's markings. Fully clothed, peaceful, original scene.",
    negative: "blizzard hiding the subject, weapons, logos",
  },
  "eve-storybook": {
    template:
      "Illustrate {subject} in an original Christmas Eve storybook living room. Gouache stockings, cocoa, a tree with simple handmade ornaments, picture-book light. Fully clothed and wholesome.",
    negative: "branded ornaments, logos, horror",
  },
  "fireside-knit": {
    template:
      "Paint {subject} as an original fireside knit portrait. Hearth light, wool blankets used as clothing layers or a chair throw, stockings on the mantel. Faces and pet markings stay clear. Fully clothed.",
    negative: "nudity under blankets, logos, text",
  },
  "oil-painting": {
    template:
      "Paint {subject} as a fine-art oil painting on canvas. Visible brushstrokes, warm varnish depth, neutral studio background, museum-quality pet portrait. Keep markings and expression faithful to the reference photos.",
    negative: "photograph, flat digital art, watermark, text",
  },
  watercolour: {
    template:
      "Paint {subject} as a delicate watercolour on textured paper. Soft washes, subtle granulation, gentle edges, recognisable face and fur markings from the reference photos.",
    negative: "oil paint, harsh outlines, photograph, watermark",
  },
  "charcoal-sketch": {
    template:
      "Draw {subject} as a charcoal sketch on toned paper. Strong values, smudged shadows, paper tooth, faithful likeness from the reference photos.",
    negative: "colour, photograph, watermark, text",
  },
  "cosy-classic": {
    template:
      "Paint {subject} as a festive Christmas ornament portrait for printing on a round bauble or flat ornament. Square 1:1 composition: subject centred inside a soft circular vignette with comfortable margin at the edges so nothing important is cropped when masked to a circle. Warm candlelight, muted reds and antique gold, subtle bokeh, elegant and calm. If the subject is a person, festive knitwear and they stay fully clothed. Keep faces and pet markings faithful to the reference photos.",
    negative: "rectangular crop cutting off ears, corner-heavy composition, logos, horror, gore",
  },
  "snow-globe": {
    template:
      "Paint {subject} inside an original snow-globe Christmas ornament scene for bauble printing. Square format, centred subject within a circular safe zone, gentle snowfall, soft greens and frosted glass glow, no branded globe base. Subject recognisable with clear eyes and markings. People wear cosy winter layers, fully clothed.",
    negative: "subject touching frame edge, dark horror snow, logos, text",
  },
  hearthside: {
    template:
      "Paint {subject} in a hearthside Christmas ornament portrait. Square composition with the subject centred for circular bauble printing, fireside warmth, tasteful wreath and garland in the background (not covering the face), gold and ember light. Wholesome, fully clothed if people. Faithful likeness from references.",
    negative: "face hidden by wreath, scary fire, logos, rectangular poster crop",
  },
};

function assertPrompts() {
  const haystack = JSON.stringify(STYLE_PROMPTS).toLowerCase();
  const names = THEMES.flatMap((theme) => theme.styles.map((style) => style.name.toLowerCase()));
  for (const word of BANNED) {
    if (haystack.includes(word) || names.some((name) => name.includes(word))) {
      throw new Error(`Style copy mentions a blocked term: ${word}`);
    }
  }
  for (const theme of THEMES) {
    for (const style of theme.styles) {
      assertStylePrompt(style.id, theme.id);
    }
  }
  for (const store of BUILTIN_STORES) {
    for (const theme of store.themes) {
      for (const style of theme.styles) {
        assertStylePrompt(style.id, `${store.id}/${theme.id}`);
      }
    }
  }
}

function assertStylePrompt(styleId: string, context: string) {
  const prompt = STYLE_PROMPTS[styleId];
  if (!prompt) throw new Error(`Missing prompt for ${context} style ${styleId}`);
  if (
    !PAINTED_STYLE_IDS.includes(styleId as (typeof PAINTED_STYLE_IDS)[number]) &&
    !/fully clothed|costume painted over their clothes/i.test(prompt.template)
  ) {
    throw new Error(`Prompt for ${styleId} must keep subjects clothed`);
  }
}

/** Called at startup and from tests so every store theme style has a prompt. */
export function assertAllStoreStylePrompts() {
  for (const store of BUILTIN_STORES) {
    for (const theme of store.themes) {
      for (const style of theme.styles) {
        if (!STYLE_PROMPTS[style.id]) {
          throw new Error(`Missing STYLE_PROMPTS entry for ${store.id} style ${style.id}`);
        }
      }
    }
  }
}

assertPrompts();
assertAllStoreStylePrompts();

export function buildPrompt(args: {
  styleId: string;
  subject: SubjectType;
  variantIndex: number;
  quality: "standard" | "hd";
  /** fal kontext has no negative prompt — omit banned-word lists from the positive prompt. */
  forFalKontext?: boolean;
}) {
  const style = STYLE_PROMPTS[args.styleId];
  if (!style) throw new Error(`No prompt configured for ${args.styleId}`);
  const strict = args.subject === "family";
  const negative = [BASE_NEGATIVE, strict ? FAMILY_NEGATIVE : "", style.negative].filter(Boolean).join(", ");
  const parts = [
    style.template.replaceAll("{subject}", SUBJECT_LINES[args.subject]),
    "Use the reference photos only to keep identity. Do not copy a copyrighted character, costume from a film, or a brand mark.",
    strict
      ? "Wholesome group portrait for a family mantel. Friendly expressions. Children stay fully clothed in costume."
      : "Keep the result wholesome, fully clothed, and family-friendly.",
    args.quality === "hd" ? "Crisp features and fine costume detail." : "Clear, natural detail.",
    `Variation ${args.variantIndex + 1}: a slightly different pose and crop, same identity.`,
  ];
  if (!args.forFalKontext) {
    parts.push(`Do not include: ${negative}.`);
  }
  const prompt = parts.join(" ");
  return { prompt, negative };
}

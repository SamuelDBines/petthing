import { THEMES, type SubjectType } from "@/config/themes";

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
      const prompt = STYLE_PROMPTS[style.id];
      if (!prompt) throw new Error(`Missing prompt for ${style.id}`);
      if (!/fully clothed|costume painted over their clothes/i.test(prompt.template)) {
        throw new Error(`Prompt for ${style.id} must keep subjects clothed`);
      }
    }
  }
}

assertPrompts();

export function buildPrompt(args: {
  styleId: string;
  subject: SubjectType;
  variantIndex: number;
  quality: "standard" | "hd";
}) {
  const style = STYLE_PROMPTS[args.styleId];
  if (!style) throw new Error(`No prompt configured for ${args.styleId}`);
  const strict = args.subject === "family";
  const negative = [BASE_NEGATIVE, strict ? FAMILY_NEGATIVE : "", style.negative].filter(Boolean).join(", ");
  const prompt = [
    style.template.replaceAll("{subject}", SUBJECT_LINES[args.subject]),
    "Use the reference photos only to keep identity. Do not copy a copyrighted character, costume from a film, or a brand mark.",
    strict
      ? "Wholesome group portrait for a family mantel. Friendly expressions. Children stay fully clothed in costume."
      : "Keep the result modest and family-friendly.",
    args.quality === "hd" ? "Crisp features and fine costume detail." : "Clear, natural detail.",
    `Variation ${args.variantIndex + 1}: a slightly different pose and crop, same identity.`,
    `Do not include: ${negative}.`,
  ].join(" ");
  return { prompt, negative };
}

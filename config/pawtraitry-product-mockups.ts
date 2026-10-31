/** 1200×1200 product mockups under public/products/pawtraitry/ */
export const PAWTRAITRY_PRODUCT_MOCKUP_SIZE = { width: 1200, height: 1200 } as const;

export type CfpmFrameColorId = "black" | "white" | "natural";

const CFPM_FRAME_MOCKUP_SRC: Record<CfpmFrameColorId, string> = {
  black: "/products/pawtraitry/framed-black.jpg",
  white: "/products/pawtraitry/framed-white.jpg",
  natural: "/products/pawtraitry/framed-natural.jpg",
};

const CFPM_FRAME_MOCKUP_ALT: Record<CfpmFrameColorId, string> = {
  black: "Pet portrait in a classic black frame with white mount",
  white: "Pet portrait in a classic white frame with white mount",
  natural: "Pet portrait in a classic natural wood frame with white mount",
};

export function cfpmFrameMockupSrc(colorId: string) {
  return CFPM_FRAME_MOCKUP_SRC[colorId as CfpmFrameColorId] ?? CFPM_FRAME_MOCKUP_SRC.black;
}

export function cfpmFrameMockupAlt(colorId: string) {
  return CFPM_FRAME_MOCKUP_ALT[colorId as CfpmFrameColorId] ?? CFPM_FRAME_MOCKUP_ALT.black;
}

export const PAWTRAITRY_PHYSICAL_MOCKUPS = {
  mug_11oz_white: {
    src: "/products/pawtraitry/mug-11oz.jpg",
    alt: "Pet portrait printed on an 11oz white mug",
  },
  cushion_18_suede: {
    src: "/products/pawtraitry/cushion-18.jpg",
    alt: "Pet portrait on an 18 inch faux suede cushion",
  },
  coasters_4pk: {
    src: "/products/pawtraitry/coasters-4pk.jpg",
    alt: "Pet portrait on a set of four cork coasters",
  },
  poster_a2_matte: {
    src: "/products/pawtraitry/poster-a2.jpg",
    alt: "Pet portrait on an A2 matte art print",
  },
  greeting_card_a5: {
    src: "/products/pawtraitry/greeting-card-a5.jpg",
    alt: "Pet portrait on an A5 greetings card",
  },
} as const;

export function pawtraitryPhysicalMockup(productId: string) {
  if (productId.startsWith("cfpm_")) {
    const color = productId.split("_").pop() as CfpmFrameColorId | undefined;
    if (color && color in CFPM_FRAME_MOCKUP_SRC) {
      return { src: cfpmFrameMockupSrc(color), alt: cfpmFrameMockupAlt(color) };
    }
  }
  return PAWTRAITRY_PHYSICAL_MOCKUPS[productId as keyof typeof PAWTRAITRY_PHYSICAL_MOCKUPS] ?? null;
}

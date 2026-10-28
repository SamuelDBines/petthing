export type FixmongerProductCopy = {
  name: string;
  benefit: string;
  description: string;
  specs: string[];
  delivery: string;
  category: "door" | "window" | "screen" | "draught" | "bundles";
  gpsr?: string;
};

const GPSR_GENERAL =
  "Check dimensions before fitting. Keep packaging for returns. Polyester mesh is for insects. Not a pet barrier or claw-proof screen.";

const DELIVERY = "Free UK delivery. Usually 3–5 working days from our UK warehouse partner";

export const FIXMONGER_COPY: Record<string, FixmongerProductCopy> = {
  "HOM-76459": {
    name: "Magnetic thermal door curtain (90×210 cm)",
    benefit: "Walk-through warmth. Magnets snap shut behind you.",
    description:
      "Thermal magnetic curtain for standard doorways. Keeps draughts out while you carry trays, pets, or pushchairs through.",
    specs: ["90×210 cm", "Magnetic centre split", "Thermal layered fabric"],
    delivery: DELIVERY,
    category: "door",
    gpsr: GPSR_GENERAL,
  },
  "HOM-76458": {
    name: "Magnetic thermal door curtain (90×200 cm)",
    benefit: "Same magnetic close for 90×200 cm doors.",
    description: "Insulated walk-through curtain sized for slightly shorter door frames.",
    specs: ["90×200 cm", "Magnetic centre split", "Thermal layered fabric"],
    delivery: DELIVERY,
    category: "door",
    gpsr: GPSR_GENERAL,
  },
  "HOM-76454": {
    name: "Magnetic thermal door curtain (80×200 cm)",
    benefit: "Narrower doorway? Same magnetic close.",
    description: "Thermal magnetic curtain for 80×200 cm openings. Ideal for utility and flat doors.",
    specs: ["80×200 cm", "Magnetic centre split", "Thermal layered fabric"],
    delivery: DELIVERY,
    category: "door",
    gpsr: GPSR_GENERAL,
  },
  "HOM-61192": {
    name: "Side-opening magnetic insect screen (80×200 cm, grey)",
    benefit: "Side entry with a hands-free magnetic close.",
    description:
      "Removable grey mesh panel for side-opening doors. Magnets along the seam let you pass through without wrestling with a frame.",
    specs: ["80×200 cm", "Side opening", "Grey mesh. Insect & spider barrier"],
    delivery: DELIVERY,
    category: "screen",
    gpsr: GPSR_GENERAL,
  },
  "HOM-61194": {
    name: "Side-opening magnetic insect screen (90×210 cm, grey)",
    benefit: "Taller door? Full-height mesh with magnets.",
    description: "Grey magnetic mesh for 90×210 cm side-opening doors. Keeps flies out while air moves.",
    specs: ["90×210 cm", "Side opening", "Grey mesh"],
    delivery: DELIVERY,
    category: "screen",
    gpsr: GPSR_GENERAL,
  },
  "HOM-61195": {
    name: "Side-opening magnetic insect screen (100×210 cm, grey)",
    benefit: "Wide side door. Still hands-free.",
    description: "100×210 cm magnetic insect screen for patio-style side openings.",
    specs: ["100×210 cm", "Side opening", "Grey mesh"],
    delivery: DELIVERY,
    category: "screen",
    gpsr: GPSR_GENERAL,
  },
  "HOM-61196": {
    name: "Side-opening magnetic insect screen (100×220 cm, grey)",
    benefit: "Extra height for full-view doors.",
    description: "Tallest side-opening size in the range. Magnetic seam closes behind you.",
    specs: ["100×220 cm", "Side opening", "Grey mesh"],
    delivery: DELIVERY,
    category: "screen",
    gpsr: GPSR_GENERAL,
  },
  "HOM-53082": {
    name: "Magnetic mesh door curtain (100×210 cm, green owl)",
    benefit: "Hands-free fly screen with a cheerful print.",
    description:
      "Walk-through mesh curtain with centre magnets. Lets breeze in, bugs out. Decorative print; not a pet-grade barrier.",
    specs: ["100×210 cm", "Centre magnets", "Printed mesh"],
    delivery: DELIVERY,
    category: "door",
    gpsr: GPSR_GENERAL,
  },
  "HOM-53081": {
    name: "Magnetic mesh door curtain (100×210 cm, coffee owl)",
    benefit: "Same magnetic mesh. Different print.",
    description: "Hands-free insect curtain for busy kitchens and utility doors.",
    specs: ["100×210 cm", "Centre magnets", "Printed mesh"],
    delivery: DELIVERY,
    category: "door",
    gpsr: GPSR_GENERAL,
  },
  "HOM-53077": {
    name: "Magnetic mesh door curtain (100×210 cm, coffee bicycle)",
    benefit: "Light mesh, magnetic close.",
    description: "Decorative magnetic fly curtain. Polyester mesh for insects, not claws.",
    specs: ["100×210 cm", "Centre magnets", "Printed mesh"],
    delivery: DELIVERY,
    category: "door",
    gpsr: GPSR_GENERAL,
  },
  "HOM-53076": {
    name: "Cut-to-fit window insect mesh (150×134 cm)",
    benefit: "Trim to your window. Hook-and-loop included.",
    description:
      "White polyester mesh with 5.8 m hook-and-loop tape. Blocks flies and spiders while you ventilate the room.",
    specs: ["150×134 cm sheet", "5.8 m hook-and-loop", "Cut to fit"],
    delivery: DELIVERY,
    category: "window",
    gpsr: GPSR_GENERAL,
  },
  "HOM-73230": {
    name: "Door-bottom draught excluder (2 m, black)",
    benefit: "Seal the gap under the door.",
    description: "Adhesive seal strip to cut draughts and dust from door bottoms.",
    specs: ["2 m length", "Black", "Self-adhesive"],
    delivery: DELIVERY,
    category: "draught",
    gpsr: GPSR_GENERAL,
  },
  "HOM-73231": {
    name: "Door-bottom draught excluder (2 m, white)",
    benefit: "Discreet white seal for internal doors.",
    description: "Flexible draught strip. Measure your gap before fitting.",
    specs: ["2 m length", "White", "Self-adhesive"],
    delivery: DELIVERY,
    category: "draught",
    gpsr: GPSR_GENERAL,
  },
  "FX-KIT-DOOR": {
    name: "All-year door kit (thermal 90×210 + mesh 90×210)",
    benefit: "Swap thermal for mesh when the weather turns.",
    description:
      "Pair our 90×210 thermal curtain with the matching grey magnetic insect screen. One doorway covered winter and summer.",
    specs: ["HOM-76459 thermal curtain", "HOM-61194 insect screen", "Free UK delivery"],
    delivery: DELIVERY,
    category: "bundles",
    gpsr: GPSR_GENERAL,
  },
};

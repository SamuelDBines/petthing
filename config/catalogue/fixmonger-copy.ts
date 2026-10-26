export type FixmongerProductCopy = {
  name: string;
  benefit: string;
  description: string;
  specs: string[];
  delivery: string;
  category: "door" | "car" | "garden" | "home" | "bundles";
  gpsr?: string;
};

const GPSR_GENERAL =
  "Check dimensions before fitting. Keep packaging for returns. Not suitable for children under 36 months unless stated.";

export const FIXMONGER_COPY: Record<string, FixmongerProductCopy> = {
  "HOM-76459": {
    name: "Magnetic thermal door curtain (90×210 cm)",
    benefit: "Stops the draught — magnets snap shut behind you.",
    description:
      "Walk-through thermal curtain for standard doorways. Magnets along the centre seam close behind you so heat stays in.",
    specs: ["90×210 cm", "Magnetic centre split", "Thermal fabric"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "door",
    gpsr: GPSR_GENERAL,
  },
  "HOM-76454": {
    name: "Magnetic thermal door curtain (80×200 cm)",
    benefit: "Narrower doorway? Same magnetic close.",
    description: "Thermal magnetic curtain sized for 80×200cm openings.",
    specs: ["80×200 cm", "Magnetic centre split", "Thermal fabric"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "door",
    gpsr: GPSR_GENERAL,
  },
  "CAR-46787": {
    name: "Windscreen frost cover",
    benefit: "Stop scraping at 6am.",
    description: "Elastic-hook frost cover for hatchbacks and estates. Folds flat in the boot.",
    specs: ["Universal fit", "Elastic hooks", "Folds for storage"],
    delivery: "UK warehouse — usually 2–4 working days",
    category: "car",
    gpsr: GPSR_GENERAL,
  },
  "HOM-62916": {
    name: "SUV windscreen cover (157×126 cm)",
    benefit: "Mirror flaps for bigger screens.",
    description: "Larger frost cover with mirror pockets for SUVs and 4×4s.",
    specs: ["157×126 cm", "Mirror flaps", "Elastic fit"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "car",
    gpsr: GPSR_GENERAL,
  },
  "HOM-74935": {
    name: "5-in-1 snow brush kit",
    benefit: "Brush, scraper, squeegee — one handle.",
    description: "Extendable handle with brush, scraper, squeegee, and ice tools for winter mornings.",
    specs: ["5 tools in 1", "Extendable handle"],
    delivery: "UK warehouse — usually 2–4 working days",
    category: "car",
    gpsr: GPSR_GENERAL,
  },
  "AB6701": {
    name: "Snow brush & scraper (2 pc)",
    benefit: "Compact kit for smaller boots.",
    description: "Two-piece snow brush and ice scraper set.",
    specs: ["2 pieces", "Brush + scraper"],
    delivery: "UK warehouse — usually 2–4 working days",
    category: "car",
    gpsr: GPSR_GENERAL,
  },
  "HOM-56098": {
    name: "Frost fleece roll (2×10 m)",
    benefit: "Tuck tender plants in before the hard frost.",
    description: "Breathable frost fleece on a 2×10m roll for beds and allotments.",
    specs: ["2×10 m roll", "Breathable fleece"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "garden",
    gpsr: GPSR_GENERAL,
  },
  "HOM-55115": {
    name: "Plant frost jacket",
    benefit: "Zip round pots on cold nights.",
    description: "Reusable zip-up jacket for shrubs and patio pots.",
    specs: ["Reusable", "Zip closure", "Frost protection"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "garden",
    gpsr: GPSR_GENERAL,
  },
  "GEM-76744": {
    name: "Christmas tree storage bag (9 ft)",
    benefit: "Loft storage without the tangled branches.",
    description: "Zip bag with handles for an artificial tree up to 9ft disassembled.",
    specs: ["Up to 9 ft tree", "Zip + handles"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "home",
    gpsr: GPSR_GENERAL,
  },
  "CAR-63366": {
    name: "Seat-back organiser",
    benefit: "Tablets, bottles, and clutter off the floor.",
    description: "Hanging organiser for the back of the front seats.",
    specs: ["Multi-pocket", "Hangs on seat back"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "car",
    gpsr: GPSR_GENERAL,
  },
  "CAR-76112": {
    name: "Memory-foam headrest pillow",
    benefit: "Motorway naps without the crick.",
    description: "Soft memory-foam pillow that loops onto the headrest.",
    specs: ["Memory foam", "Headrest loop"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "car",
    gpsr: GPSR_GENERAL,
  },
  "CAR-75067": {
    name: "Steering wheel lock",
    benefit: "Visible deterrent on the drive.",
    description: "Bright steering-wheel lock — a cheap peace-of-mind fix.",
    specs: ["Steering wheel fit", "Visible deterrent"],
    delivery: "UK warehouse — usually 2–4 working days",
    category: "car",
    gpsr: GPSR_GENERAL,
  },
  "HOM-53076": {
    name: "Window insect mesh",
    benefit: "Air the house without the midges.",
    description: "Stick-on mesh panels for open windows in summer.",
    specs: ["Adhesive mesh", "Trim to fit"],
    delivery: "UK warehouse — usually 2–4 working days",
    category: "home",
    gpsr: GPSR_GENERAL,
  },
  "HB-75865": {
    name: "Rear sun shades (pair)",
    benefit: "Stops the kids complaining on sunny school runs.",
    description: "Pop-on mesh sun shades for rear side windows.",
    specs: ["2 shades", "Pop-on fit"],
    delivery: "UK warehouse — usually 2–4 working days",
    category: "car",
    gpsr: GPSR_GENERAL,
  },
  "FX-KIT-CAR": {
    name: "Winter car kit",
    benefit: "Frost cover plus brush — save vs buying separately.",
    description: "Bundle: windscreen frost cover and 2-piece snow brush/scraper.",
    specs: ["Frost cover", "2-pc brush set"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "bundles",
    gpsr: GPSR_GENERAL,
  },
  "FX-KIT-DOOR": {
    name: "Draught-proof door kit",
    benefit: "Curtain plus frost cover for porch and car.",
    description: "Bundle: 90×210 magnetic thermal curtain and windscreen frost cover.",
    specs: ["90×210 curtain", "Frost cover"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "bundles",
    gpsr: GPSR_GENERAL,
  },
  "FX-KIT-GARDEN": {
    name: "Garden frost kit",
    benefit: "Fleece roll and two jackets — genuine bundle saving.",
    description: "Bundle: 2×10m frost fleece roll plus two plant frost jackets.",
    specs: ["2×10 m fleece", "2 plant jackets"],
    delivery: "UK warehouse — usually 3–5 working days",
    category: "bundles",
    gpsr: GPSR_GENERAL,
  },
};

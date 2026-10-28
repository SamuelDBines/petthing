export type JinglefoldProductCopy = {
  name: string;
  benefit: string;
  description: string;
  specs: string[];
  delivery: string;
  category: "tree" | "door" | "home" | "gifts" | "bundles";
  gpsr?: string;
};

export const JINGLEFOLD_COPY: Record<string, JinglefoldProductCopy> = {
  "GEM-76745": {
    name: "Velvet bauble set (20)",
    benefit: "Rich red and green shatterproof baubles. Dress the tree in one box.",
    description:
      "Twenty 6cm matte velvet-finish baubles in classic Christmas colours. Shatterproof plastic, ready to hang.",
    specs: ["20 baubles", "6 cm diameter", "Shatterproof plastic", "Red & green matte velvet finish"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "tree",
  },
  "GEM-76752": {
    name: "Wooden nutcracker trio",
    benefit: "Three hand-painted nutcrackers for branches or the mantel.",
    description: "Set of three 12.5cm red wooden nutcracker ornaments with hanging loops.",
    specs: ["3 ornaments", "12.5 cm tall", "Wood with painted detail"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "tree",
  },
  "GEM-76758": {
    name: "Glitter reindeer (25 cm)",
    benefit: "A standing stag that catches the light on the sideboard.",
    description: "Silver glitter reindeer table decoration, freestanding, 25cm tall.",
    specs: ["25 cm height", "Glitter finish", "Freestanding"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "home",
  },
  "HOM-55255": {
    name: "Wreath hanger (28 cm)",
    benefit: "Hang a wreath without hammering the door.",
    description: "Black metal over-door wreath hook, 28cm reach.",
    specs: ["28 cm hook", "Black metal", "Over-door fit"],
    delivery: "UK warehouse, usually 2–4 working days",
    category: "door",
  },
  "AB6412": {
    name: "Wreath hangers, pack of 3",
    benefit: "Three doors, three hooks. Spare for the garage or porch.",
    description: "Pack of three 28cm black wreath hooks.",
    specs: ["3 hooks", "28 cm each", "Black metal"],
    delivery: "UK warehouse, usually 2–4 working days",
    category: "door",
  },
  "AB6703": {
    name: "Glitter Santa door banner (3)",
    benefit: "Instant festive front door without climbing a ladder.",
    description: "Three glitter Santa hanging decorations for wall or door.",
    specs: ["3 pieces", "Glitter finish", "Indoor/outdoor"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "door",
  },
  "AB6702": {
    name: "Santa & snowman door stickers (3)",
    benefit: "Peel-and-stick cheer for internal doors.",
    description: "Three glitter wall/door hanging decor pieces. Santa and snowman designs.",
    specs: ["3 pieces", "DIY hang", "Glitter accent"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "door",
  },
  "EPG-66077": {
    name: "Straw heart wreath (24 cm)",
    benefit: "Natural texture that works beyond Christmas.",
    description: "Rattan/straw heart wreath for door or table, 24cm.",
    specs: ["24 cm diameter", "Natural straw/rattan"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "door",
  },
  "GEM-76735": {
    name: "Scented candle trio",
    benefit: "Gingerbread, cinnamon, and mulled wine: the whole house smells like December.",
    description: "Gift set of three jar candles in festive scents. Keep away from children and pets.",
    specs: ["3 jar candles", "Gingerbread, cinnamon, mulled wine scents"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "gifts",
    gpsr: "Only burn on a heat-resistant surface. Never leave a burning candle unattended. Keep out of reach of children and pets.",
  },
  "HOM-74929": {
    name: "Snowflake table runner",
    benefit: "Dress the dining table before the big lunch.",
    description: "Snowflake-pattern table runner for Christmas table settings.",
    specs: ["Table runner", "Snowflake pattern"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "home",
  },
  "HOM-76520": {
    name: "3D Christmas cards (30)",
    benefit: "Five designs, plenty for neighbours and school runs.",
    description: "Thirty fold-out 3D Christmas cards in five designs.",
    specs: ["30 cards", "5 designs", "3D fold-out"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "gifts",
  },
  "GEM-76753": {
    name: "Santa sack (60×50 cm)",
    benefit: "One big sack for Santa, or hiding presents until the 25th.",
    description: "Large red drawstring Santa sack, 60×50cm.",
    specs: ["60×50 cm", "Red fabric", "Drawstring closure"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "gifts",
  },
  "GEM-76744": {
    name: "Tree storage bag (9 ft)",
    benefit: "Zip the artificial tree away without the loft tangling.",
    description: "Heavy-duty bag for a disassembled tree up to 9ft, with carry handles.",
    specs: ["Fits up to 9 ft tree", "Zip closure", "Carry handles"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "home",
  },
  "HOM-58602": {
    name: "Santa fairy lights (2 m)",
    benefit: "Ten warm LEDs along a shelf or mantel.",
    description: "2m string of ten LED Santa lights for indoor decor.",
    specs: ["2 m length", "10 LEDs", "Santa motif", "Indoor use"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "home",
    gpsr: "Indoor use only. Check voltage and fuse rating on the plug before use.",
  },
  "GEM-76756": {
    name: "Christmas pudding dog toy",
    benefit: "A squeaky stocking filler for good dogs.",
    description: "Plush Christmas pudding chew toy with squeaker, 14.5cm.",
    specs: ["14.5 cm", "Plush with squeaker", "Small dogs"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "gifts",
  },
  "HOM-41591": {
    name: "Faux ivy garland",
    benefit: "Greenery along the banister without watering.",
    description: "Artificial hanging ivy garland for mantels and rails.",
    specs: ["Artificial foliage", "Hanging garland"],
    delivery: "UK warehouse, usually 3–5 working days",
    category: "home",
  },
  "XM-KIT-TREE": {
    name: "Tree-dressing bundle",
    benefit: "Baubles, nutcrackers, and a glitter stag. Genuine bundle saving.",
    description: "Twenty velvet baubles, three wooden nutcrackers, and a 25cm glitter reindeer.",
    specs: ["20 baubles", "3 nutcrackers", "1 reindeer (25 cm)"],
    delivery: "Ships as one order. Usually 3–5 working days",
    category: "bundles",
  },
};

// One-off: rewrite brands/primaryBrand/channels/primaryChannel for every seed in
// src/data/demo-graph.ts based on the approved department -> brand/channel mapping.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/data/demo-graph.ts";

// Canonical "All Channels" leaf set already used throughout the data.
const ALL_CHANNELS = [
  "North America Professional",
  "Luxury Residential",
  "National Accounts",
  "Enterprise",
];
const ALL_BRANDS = ["Sonance", "James", "iPort"];

// department -> channel rule
const CHANNEL_BY_DEPT = {
  "Luxury Resi International": { channels: ["International Residential"], primaryChannel: "International Residential" },
  "Global Luxury Resi": { channels: ["Luxury Residential"], primaryChannel: "Luxury Residential" },
  "Luxury Resi N &S America": { channels: ["Luxury Residential"], primaryChannel: "Luxury Residential" },
  "National Accounts": { channels: ["National Accounts"], primaryChannel: "National Accounts" },
  "Global Commercial Sales": { channels: ["North America Professional"], primaryChannel: "North America Professional" },
  "Global Commercial Marketing": { channels: ["North America Professional"], primaryChannel: "North America Professional" },
  "iPort Enterprise Sales": { channels: ["Enterprise"], primaryChannel: "Enterprise" },
  "iPort Enterprise Marketing": { channels: ["Enterprise"], primaryChannel: "Enterprise" },
};
const ALL_CHANNELS_RULE = { channels: ALL_CHANNELS, primaryChannel: "All Channels" };

// department -> brand rule
const ALL_BRANDS_RULE = { brands: ALL_BRANDS, primaryBrand: "All Brands" };
const IPORT_RULE = { brands: ["iPort"], primaryBrand: "iPort" };
const AUDIO_RULE = { brands: ["Sonance", "James"], primaryBrand: "Sonance" };
const JAMES_RULE = { brands: ["James"], primaryBrand: "James" };

const BRAND_BY_DEPT = {
  // James-branded production
  "James Manufacturing - Direct": JAMES_RULE,
  "James Manufacturing - Indirect": JAMES_RULE,
  // iPort
  "R&D iPort Engineering": IPORT_RULE,
  "iPort Enterprise Sales": IPORT_RULE,
  "iPort Enterprise Marketing": IPORT_RULE,
  // Audio R&D (Sonance + James)
  "R&D Engineering": AUDIO_RULE,
  "R&D Speaker Engineering": AUDIO_RULE,
  "R&D Electronics Engineering": AUDIO_RULE,
  "Technology and Innovation": AUDIO_RULE,
  // cross-cutting ops + corporate + shared support + GTM teams -> All Brands
  "Ops MND": ALL_BRANDS_RULE,
  "Ops FNT": ALL_BRANDS_RULE,
  "Ops SC": ALL_BRANDS_RULE,
  "Quality Control": ALL_BRANDS_RULE,
  "Administration": ALL_BRANDS_RULE,
  "Finance": ALL_BRANDS_RULE,
  "IT": ALL_BRANDS_RULE,
  "Sales Ops": ALL_BRANDS_RULE,
  "Brand Marketing": ALL_BRANDS_RULE,
  "Dealer Services": ALL_BRANDS_RULE,
  "National Accounts": ALL_BRANDS_RULE,
  "Global Commercial Sales": ALL_BRANDS_RULE,
  "Global Commercial Marketing": ALL_BRANDS_RULE,
  "Sales": ALL_BRANDS_RULE,
  "Global Luxury Resi": ALL_BRANDS_RULE,
  "Luxury Resi N &S America": ALL_BRANDS_RULE,
  "Luxury Resi International": ALL_BRANDS_RULE,
};

const arr = (xs) => "[" + xs.map((x) => `"${x}"`).join(", ") + "]";

let text = readFileSync(FILE, "utf8");
const lines = text.split("\n");
let changed = 0;
const seen = new Set();

const out = lines.map((line) => {
  const m = line.match(/department: "([^"]*)"/);
  if (!m || !/\{ id: "person-/.test(line)) return line;
  const dept = m[1];
  seen.add(dept);
  const ch = CHANNEL_BY_DEPT[dept] ?? ALL_CHANNELS_RULE;
  const br = BRAND_BY_DEPT[dept];
  if (!br) throw new Error(`No brand rule for department: ${dept}`);

  const replacement =
    `brands: ${arr(br.brands)}, primaryBrand: "${br.primaryBrand}", ` +
    `channels: ${arr(ch.channels)}, primaryChannel: "${ch.primaryChannel}"`;

  const next = line.replace(
    /brands: \[[^\]]*\], primaryBrand: "[^"]*", channels: \[[^\]]*\], primaryChannel: "[^"]*"/,
    replacement,
  );
  if (next !== line) changed += 1;
  return next;
});

writeFileSync(FILE, out.join("\n"));
console.log(`Departments seen: ${seen.size}`);
console.log(`Lines changed: ${changed}`);

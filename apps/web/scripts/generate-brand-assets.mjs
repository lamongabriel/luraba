// Generates the favicon set (app/favicon.ico + public/brand), PWA icons and default OG image from the Luraba mark.
// Run: pnpm --filter @luraba/web brand:generate   (see components/brand/README.md)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function loadSharp() {
  try {
    return require("sharp");
  } catch {
    // sharp is a transitive dependency of next; find it in the pnpm store.
    const store = join(webRoot, "..", "..", "node_modules", ".pnpm");
    const dir = readdirSync(store).find((name) => name.startsWith("sharp@"));
    if (!dir) throw new Error("sharp not found. Run: pnpm --filter @luraba/web add -D sharp");
    return require(join(store, dir, "node_modules", "sharp"));
  }
}
const sharp = loadSharp();

// Read the brand constants and mark paths from the TS sources so there is one definition.
const read = (file) => readFileSync(join(webRoot, "components/brand", file), "utf8");
const BRAND = {
  name: read("constants.ts").match(/name: "([^"]+)"/)[1],
  tagline: read("constants.ts").match(/tagline: "([^"]+)"/)[1],
  background: read("constants.ts").match(/background: "([^"]+)"/)[1],
  ink: read("constants.ts").match(/ink: "([^"]+)"/)[1],
};
const paths = [...read("mark-paths.ts").matchAll(/^ {2}"([^"]+)",$/gm)].map((m) => m[1]);

const markGroup = (x, y, size, color) =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths
    .map((d) => `<path d="${d}"/>`)
    .join("")}</g>`;

/** Square icon: dark tile with the mark. `radius` is a fraction of the size (0 = full bleed). */
const iconSvg = (size, { radius, markRatio }) => {
  const mark = size * markRatio;
  const offset = (size - mark) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * radius}" fill="${BRAND.background}"/>${markGroup(offset, offset, mark, BRAND.ink)}</svg>`;
};

const out = (...parts) => {
  const path = join(webRoot, "public", ...parts);
  mkdirSync(dirname(path), { recursive: true });
  return path;
};
const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();

// Favicons (rounded tile) and ICO with 16/32/48 PNG payloads.
const rounded = { radius: 0.22, markRatio: 0.7 };
const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(icoSizes.map((s) => png(iconSvg(256, rounded), s)));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = 6 + 16 * icoSizes.length;
const entries = icoImages.map((img, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(icoSizes[i], 0);
  entry.writeUInt8(icoSizes[i], 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(img.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += img.length;
  return entry;
});
writeFileSync(
  join(webRoot, "app", "favicon.ico"),
  Buffer.concat([header, ...entries, ...icoImages]),
);

writeFileSync(out("brand", "favicon-16x16.png"), icoImages[0]);
writeFileSync(out("brand", "favicon-32x32.png"), icoImages[1]);
// Apple and Android icons are full bleed; the OS applies its own mask.
const bleed = { radius: 0, markRatio: 0.58 };
writeFileSync(out("brand", "apple-touch-icon.png"), await png(iconSvg(512, bleed), 180));
writeFileSync(out("brand", "android-chrome-192x192.png"), await png(iconSvg(512, bleed), 192));
writeFileSync(out("brand", "android-chrome-512x512.png"), await png(iconSvg(512, bleed), 512));
writeFileSync(
  out("brand", "logo-mark.svg"),
  iconSvg(512, rounded)
    .replace(/ width="512" height="512"/, "")
    .replace(">", `><title>${BRAND.name}</title>`),
);

// OG / Twitter image, 1200x630.
const W = 1200;
const H = 630;
const font = "Helvetica Neue, Helvetica, Arial, sans-serif";
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="g" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="${BRAND.ink}" stop-opacity="0.14"/><stop offset="1" stop-color="${BRAND.ink}" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="${BRAND.background}"/><rect width="${W}" height="${H}" fill="url(#g)"/>
<rect x="96" y="${H / 2 - 150}" width="164" height="164" rx="40" fill="${BRAND.ink}" fill-opacity="0.12"/>
${markGroup(96 + 32, H / 2 - 150 + 32, 100, BRAND.ink)}
<text x="96" y="${H / 2 + 120}" font-family="${font}" font-size="104" font-weight="700" fill="${BRAND.ink}">${BRAND.name}</text>
<text x="100" y="${H / 2 + 184}" font-family="${font}" font-size="40" fill="${BRAND.ink}" fill-opacity="0.68">${BRAND.tagline}</text>
</svg>`;
const og = await sharp(Buffer.from(ogSvg), { density: 144 }).resize(W, H).png().toBuffer();
writeFileSync(out("og", "og-default.png"), og);
writeFileSync(out("og", "twitter-default.png"), og);
console.log("Brand assets written to app/favicon.ico, public/brand and public/og");

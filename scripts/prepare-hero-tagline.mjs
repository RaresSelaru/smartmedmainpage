import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const input =
  process.argv[2] ?? path.join(root, "public/assets/brand/hero-medicina-academica-user.svg");
const output = path.join(root, "public/assets/brand/hero-medicina-academica.svg");
const taglineFill = "#9cced0";

if (!fs.existsSync(input)) {
  console.error(`Lipsește fișierul: ${input}`);
  console.error(
    "Exportă din Canva ca SVG și salvează-l ca public/assets/brand/hero-medicina-academica-user.svg",
  );
  process.exit(1);
}

if (!input.endsWith(".svg")) {
  console.error("Fișierul trebuie să fie .svg (export din Canva/Figma, nu PNG).");
  process.exit(1);
}

let svg = fs.readFileSync(input, "utf8");

const whiteFill =
  /(?:#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/i;

// Elimină dreptunghiul de fundal alb (Canva pune adesea un <rect> full-size).
svg = svg.replace(/<rect\b[^>]*\/>/gi, (rect) => {
  if (whiteFill.test(rect) && /width\s*=\s*["']100%|height\s*=\s*["']100%/.test(rect)) {
    return "";
  }
  return rect;
});

// Înlocuiește fill-uri albe cu aqua (text vizibil pe hero întunecat).
svg = svg.replace(
  /fill\s*=\s*["'](?:#fff(?:fff)?|white)["']/gi,
  `fill="${taglineFill}"`,
);
svg = svg.replace(/fill\s*:\s*(?:#fff(?:fff)?|white)\s*;?/gi, `fill:${taglineFill};`);

// Fundal transparent pe root.
svg = svg.replace(/<svg\b/, '<svg fill="none" ');

fs.writeFileSync(output, svg);
console.log(`Salvat: ${output}`);

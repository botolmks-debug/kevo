import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

const ANGLES = [
  "Eye-level, produk di tengah frame.",
  "High angle, produk di sepertiga bawah.",
  "Low angle, produk tampak dominan.",
  "Rule-of-thirds, produk di sisi dengan ruang napas.",
  "Close-up dengan bokeh kuat.",
  "45 derajat dari samping.",
];
const MOODS = [
  "Indoor hangat, cahaya lampu lembut.",
  "Indoor cozy, cahaya jendela sore.",
  "Cahaya pagi lembut masuk dari samping.",
  "Indoor cafe, pencahayaan warm tungsten.",
  "Suasana dalam ruangan dengan cahaya aksen.",
  "Indoor minimalis, soft diffused light.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildScenePrompt(profile: BusinessProfile): string {
  return `You are a world-class commercial product photographer. Create an award-winning advertising image.

STEP 1 - PRODUCT PRESERVATION:
Keep the main product/object EXACTLY as photographed. Do NOT redraw, restyle, distort, or alter its shape, proportions, colors, or appearance in any way. ALL text, labels, prints, and designs PHYSICALLY ON the product's own surface must be perfectly preserved and readable.

STEP 2 - AGGRESSIVE CLEANUP (zero tolerance for leftover text):
Remove EVERYTHING from the image EXCEPT the physical product itself:
- Remove the ENTIRE original background - walls, floors, surfaces, objects, people.
- Remove ALL overlaid text/graphics that were added to the photo and are NOT physically printed on the product. This includes WITHOUT EXCEPTION:
  - Camera/phone watermarks: "REDMI Note 13", "REDMI NOTE 13", "Shot on Redmi", "Shot on iPhone", "POCO", "Samsung", "Xiaomi", "Realme", any phone brand or model name
  - Date/time stamps: any numbers in format DD/MM/YYYY HH:MM or similar
  - Copyright notices, website URLs, promo text, price tags, stickers
  - ANY text floating on the photo background
- DOUBLE-CHECK before proceeding: scan the entire image. If ANY text remains that is NOT printed on the product itself - remove it. The output must be 100% free of background text.

STEP 3 - NEW SCENE GENERATION:
Business context:
- Industry: ${profile.business.industry || "-"}
- Location: ${profile.business.location || "-"}
- Differentiator: ${profile.positioning.differentiator || "-"}
- Target customers: ${profile.offering.targetCustomer || "-"}

Create a FRESH scene: ${pick(ANGLES)} ${pick(MOODS)}
- Prefer INDOOR settings with warm ambient lighting - NOT harsh daylight.
- Use professional lighting: soft key light + gentle fill. Rich warm shadows, not flat.
- Shallow depth of field (f/1.8): product sharp, background creamy bokeh.

STEP 4 - PHOTOREALISTIC INTEGRATION:
- Relight the product to perfectly match the new scene's light direction and color temperature.
- Add contact shadow + ambient occlusion so the product sits naturally on the surface.
- Blend edges naturally - no cut-out outline, no halo.
- Match focus, grain, and white balance of the background.

STEP 5 - FRAMING (fill the whole frame):
- The scene MUST fill the ENTIRE frame edge-to-edge. NO empty margins, NO blank/plain areas, NO black or white bars, NO border/padding.
- The bottom ~third will be covered later by a thin dark layer with text, so keep it a bit calmer - but it must STILL contain the scene/background, never left blank.

Do NOT add any new text, logos, watermarks, or branding to the scene. Product is the HERO.`;
}
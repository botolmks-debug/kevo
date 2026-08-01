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

export function buildScenePrompt(profile: BusinessProfile, sizeHint?: string): string {
  const sizeNote =
    sizeHint && sizeHint.trim()
      ? `\n\nPRODUCT SIZE (critical for scale): product is approximately "${sizeHint.trim()}". Render it at its REAL size relative to the scene. If LARGE (machine, fridge, furniture, vending machine): show it standing on the FLOOR as a big, dominant object in a real room; do NOT shrink it or place it like a small item on a table. If SMALL (packaging, bottle, food): a close-up on a table/surface is fine.`
      : "";
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

Do NOT add any new text, logos, watermarks, or branding to the scene. Product is the HERO.${sizeNote}`;
}

/**
 * Untuk kategori RUANGAN / Suasana / Fasilitas. Ruangan adalah TEMPAT, bukan
 * produk: jangan menambah/mengurangi/memindahkan apa pun — hanya percantik
 * cahaya & realisme.
 */
export function buildRuanganPrompt(profile: BusinessProfile, sizeHint?: string): string {
  const sizeNote = sizeHint && sizeHint.trim() ? `\nApproximate room size: "${sizeHint.trim()}" — keep proportions realistic.` : "";
  return `This image is a PLACE / room / facility — NOT a product. Enhance it as a professional interior/real-estate photographer would.

CRITICAL - PRESERVE THE ROOM EXACTLY:
- Do NOT add, remove, move, replace, or invent ANY object, furniture, wall, window, door, plant, or element.
- Keep the EXACT same layout, contents, geometry, and composition as the original photo. Same room, same things, same positions.

ONLY IMPROVE (do not change content):
- Lighting: make it warm, natural, balanced, and inviting. Fix dull/dark/flat or harsh lighting; recover shadows and highlights.
- Realism & clarity: clean, sharp, photorealistic result — as if professionally reshot. Natural, appealing colors and white balance.
- Remove ONLY phone watermarks / date stamps / added overlay text if present (e.g. "REDMI Note 13", date/time). Do NOT remove real objects.

Business context (for mood only, do NOT add objects): Industry ${profile.business.industry || "-"}, Location ${profile.business.location || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.${sizeNote}

Photorealistic (NOT illustration/cartoon). Do NOT add any text, logos, or watermarks. Fill the whole frame edge-to-edge; keep the bottom third a bit calmer for later text but never blank.`;
}

/**
 * Untuk kategori WAJAH / ORANG. Orang tidak diperlakukan seperti produk yang
 * ditempel di meja — tapi menyatu dengan lingkungan target market, DAN menjadi
 * pusat perhatian.
 */
export function buildOrangPrompt(profile: BusinessProfile): string {
  return `The main subject is a PERSON. Do NOT treat them like a product placed or stuck on a table.

CRITICAL - PRESERVE THE PERSON:
- Keep the person's face, features, expression, hair, body, and clothing EXACTLY as in the original. Do NOT change their identity, look, or proportions. ALL text physically printed on their clothes stays as-is.

INTEGRATE NATURALLY:
- Place/blend the person into a real, believable environment that fits the business target market (see context) — as if genuinely photographed there. Match lighting direction, color temperature, perspective, and shadows so they truly belong. NO cut-out outline, NO halo, NO pasted look.

PERSON IS THE HERO (center of attention):
- The person is clearly the focus: well-lit, sharp, in the foreground. The environment is a supportive background with shallow depth of field (soft bokeh). The eye should go to the person first.

Business context: Industry ${profile.business.industry || "-"}, Location ${profile.business.location || "-"}, Differentiator ${profile.positioning.differentiator || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.

Photorealistic, warm professional lighting. Remove phone watermarks / date stamps / added overlay text if present. Do NOT add any new text, logos, or branding. Fill the whole frame edge-to-edge; keep the bottom third a bit calmer for later text but never blank.`;
}

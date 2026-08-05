import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import { localeSceneNote, type Lang } from "@/lib/ai/lang";

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

export function buildScenePrompt(profile: BusinessProfile, sizeHint?: string, lang?: Lang): string {
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

Do NOT add any new text, logos, watermarks, or branding to the scene. Product is the HERO.${sizeNote}

${localeSceneNote(lang)}`;
}

/**
 * Untuk kategori RUANGAN / Suasana / Fasilitas. Ruangan adalah TEMPAT, bukan
 * produk: jangan menambah/mengurangi/memindahkan apa pun — hanya percantik
 * cahaya & realisme.
 */
export function buildRuanganPrompt(profile: BusinessProfile, sizeHint?: string, lang?: Lang): string {
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

Photorealistic (NOT illustration/cartoon). Do NOT add any text, logos, or watermarks. Fill the whole frame edge-to-edge; keep the bottom third a bit calmer for later text but never blank.

${localeSceneNote(lang)}`;
}

/**
 * Untuk kategori WAJAH / ORANG. Orang tidak diperlakukan seperti produk yang
 * ditempel di meja — tapi menyatu dengan lingkungan target market, DAN menjadi
 * pusat perhatian.
 */
export function buildOrangPrompt(profile: BusinessProfile, lang?: Lang): string {
  return `The main subject is a PERSON. Do NOT treat them like a product placed or stuck on a table.

CRITICAL - PRESERVE THE PERSON:
- Keep the person's face, features, expression, hair, body, and clothing EXACTLY as in the original. Do NOT change their identity, look, or proportions. ALL text physically printed on their clothes stays as-is.

INTEGRATE NATURALLY:
- Place/blend the person into a real, believable environment that fits the business target market (see context) — as if genuinely photographed there. Match lighting direction, color temperature, perspective, and shadows so they truly belong. NO cut-out outline, NO halo, NO pasted look.

PERSON IS THE HERO (center of attention):
- The person is clearly the focus: well-lit, sharp, in the foreground. The environment is a supportive background with shallow depth of field (soft bokeh). The eye should go to the person first.

Business context: Industry ${profile.business.industry || "-"}, Location ${profile.business.location || "-"}, Differentiator ${profile.positioning.differentiator || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.

Photorealistic, warm professional lighting. Remove phone watermarks / date stamps / added overlay text if present. Do NOT add any new text, logos, or branding. Fill the whole frame edge-to-edge; keep the bottom third a bit calmer for later text but never blank.

${localeSceneNote(lang)}`;
}

/**
 * Untuk kategori SOFTWARE / WEBSITE. Gambar yang diupload = SCREENSHOT UI.
 * AI membuat adegan orang (target market) memakai/menunjukkan software itu di
 * layar desktop/smartphone. `display` = "desktop" | "smartphone".
 */
export function buildSoftwarePrompt(profile: BusinessProfile, display?: string, lang?: Lang): string {
  const device =
    display === "desktop"
      ? "a laptop or desktop monitor on a desk"
      : "a smartphone held in the hand";
  return `This image is a SCREENSHOT of a software / app / website user interface — NOT a physical product. Create a photorealistic lifestyle advertising scene.

GOAL: a real PERSON who fits the business's target customers is SHOWING this software to the viewer on ${device}, with the screen facing the camera.

SCREEN (most important):
- The device screen MUST face the CAMERA / viewer directly, so the screenshot is fully visible, UPRIGHT, and readable to us. NEVER mirror, flip, reverse, or rotate the screenshot. NEVER show the screen from the back or angled away from the viewer.
- The person holds/tilts the device so its screen points TOWARD the camera (like showing it to us) — do NOT show them looking at a screen that faces away from us.
- Display the given screenshot EXACTLY as-is on the screen — undistorted, sharp, correctly oriented (never backwards/mirrored), with correct perspective and a subtle screen glow/reflection.
- Do NOT redraw, restyle, crop, mirror, or add/remove any text or element inside the screenshot UI. Keep the interface identical and readable.

PERSON & SCENE:
- The person interacts naturally (looking at, pointing to, or holding the device), engaged and positive — like a happy user.
- Person + device are the clear focus. Environment fits the target market (office, cafe, or home per context), warm professional lighting, shallow depth of field (soft background).
- Remove any phone watermarks / date stamps / added overlay text if present.

Business context: Industry ${profile.business.industry || "-"}, Location ${profile.business.location || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.

Do NOT add any new text, logos, or branding to the scene. Fill the whole frame edge-to-edge; keep the bottom third a bit calmer for later text but never blank.

${localeSceneNote(lang)}`;
}

/**
 * Untuk kategori KECANTIKAN / SKINCARE. Gaya bersih & premium. Kalau deskripsi
 * user menyebut BAGIAN TUBUH tempat produk dipakai (wajah, tangan, bibir,
 * rambut, kulit, dll), AI menampilkan produk seolah sedang DIPAKAI di bagian
 * itu. Dipakai HANYA di Otomatis (di manual, skincare = produk biasa).
 */
export function buildSkincarePrompt(profile: BusinessProfile, description?: string, lang?: Lang): string {
  const desc = (description ?? "").trim();
  const usageNote = desc
    ? `\n\nUSAGE — the user described this product as: "${desc}".
- If this mentions WHERE it is used (face, cheeks, hands, lips, hair, under-eyes, neck, body, skin, etc.), show the product being USED / APPLIED on THAT body part naturally and tastefully — e.g. a hand smoothing cream on skin, a serum drop on a fingertip near the face, product held beside glowing skin. Realistic, elegant, never clinical or awkward.
- The PRODUCT itself stays the clear hero: sharp, well-lit, label readable.`
    : "\n\nNo usage described: present the product elegantly on a clean premium surface (soft marble, silk, or with subtle botanicals/water droplets).";
  return `This image is a BEAUTY / SKINCARE / cosmetic product. Create a clean, PREMIUM, high-end beauty advertising image.

PRODUCT PRESERVATION: keep the product EXACTLY as photographed — its shape, colors, and every text/label printed on it. Do NOT redraw or restyle it.

STYLE: clean, minimal, premium, spa-like and hygienic. Soft diffused lighting, elegant neutral or soft pastel tones, gentle reflections, dewy fresh feel, shallow depth of field. Looks like a luxury cosmetic commercial.${usageNote}

Business context: Industry ${profile.business.industry || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.

Remove phone watermarks / date stamps / added overlay text if present. Do NOT add any new text, logos, or branding to the scene. Fill the whole frame edge-to-edge; keep the bottom third a bit calmer for later text but never blank.

${localeSceneNote(lang)}`;
}

/**
 * Untuk kategori MAKANAN / MINUMAN. Gaya food photography yang menggugah selera.
 * Dipakai HANYA di Otomatis (di manual, makanan = produk biasa).
 */
export function buildFoodPrompt(profile: BusinessProfile, description?: string, lang?: Lang): string {
  const desc = (description ?? "").trim();
  const dishNote = desc ? `\n\nThe user described this as: "${desc}". Keep it that exact dish/drink.` : "";
  return `This image is FOOD or a DRINK. Create a mouth-watering, professional FOOD PHOTOGRAPHY image that makes people crave it and want to order.

FOOD PRESERVATION: keep the actual food/drink EXACTLY as photographed — same dish, same ingredients, same colors and portions. Do NOT invent a different food or add/remove ingredients that aren't there. Preserve any packaging/label text.

STYLE (appetizing food photography):
- Close-up, appetizing angle (about 45 degrees, or top-down if it suits the dish). Sharp focus on the food with shallow depth of field (soft background).
- Fresh, irresistible cues ONLY where natural: gentle steam for hot food, condensation / water droplets for cold drinks, glossy sauce sheen, fresh garnish. Subtle and realistic — never overdone.
- Clean, tasteful plating in a warm, inviting setting (rustic wood, marble, or soft neutral surface). Natural warm lighting, cozy cafe/restaurant mood.
- Rich, vibrant, freshly-served colors.

Business context: Industry ${profile.business.industry || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.${dishNote}

Remove phone watermarks / date stamps / added overlay text if present. Do NOT add any new text, logos, or branding to the scene. Fill the whole frame edge-to-edge; keep the bottom third a bit calmer for later text but never blank.

${localeSceneNote(lang)}`;
}

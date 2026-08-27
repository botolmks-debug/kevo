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
// MOODS = murni gaya PENCAHAYAAN — TIDAK boleh menyebut jenis tempat
// (dulu ada "Indoor cafe" → produk non-kafe ikut ditaruh di kafe).
// Tempat/lingkungan ditentukan oleh SETTING RULE di STEP 3 berdasar produknya.
const MOODS = [
  "Cahaya lampu hangat yang lembut.",
  "Cahaya jendela sore yang cozy.",
  "Cahaya pagi lembut masuk dari samping.",
  "Pencahayaan warm tungsten.",
  "Cahaya aksen dramatis lembut.",
  "Soft diffused light, bersih & minimalis.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildScenePrompt(profile: BusinessProfile, sizeHint?: string, lang?: Lang, productDescription?: string): string {
  const sizeNote =
    sizeHint && sizeHint.trim()
      ? `\n\nPRODUCT SIZE (critical for scale): product is approximately "${sizeHint.trim()}". Render it at its REAL size relative to the scene. If LARGE (machine, fridge, furniture, vending machine): show it standing on the FLOOR as a big, dominant object in a real room; do NOT shrink it or place it like a small item on a table. If SMALL (packaging, bottle, food): a close-up on a table/surface is fine.`
      : "";
  return `You are a world-class commercial product photographer. Create an award-winning advertising image.

STEP 1 - PRODUCT IDENTITY (preserve) vs LIGHTING (may be adjusted for naturalness):
Preserve the product's IDENTITY exactly: its shape, proportions, materials, real colors, and ALL text/labels/prints/designs physically ON its surface (kept sharp and readable). This ALSO covers everything that makes up the product itself — its real CONTENTS and components: the food and its toppings/ingredients, the liquid and its colour, whatever is inside a container or visible through/inside the packaging. Keep all of that EXACTLY as photographed — same items, same colours, same textures, same arrangement. Do NOT redraw, restyle, reshape, add, or remove any part of the product or its contents.
The ONLY thing you may change about the product is its LIGHTING: you MUST re-render its lighting, shadows, reflections, and highlights to match the new scene so it looks natural — this is REQUIRED and does NOT count as altering the product. A product that keeps its original flat lighting while sitting in a new scene is the #1 cause of a fake "pasted sticker" look. Relight it as if it were physically re-photographed inside the new scene.

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
- The product in the photo: ${productDescription && productDescription.trim() ? productDescription.trim() : "(no description — identify it from the photo itself)"}

SETTING RULE (critical — the #1 mistake to avoid is a mismatched location):
- FIRST decide WHERE this exact product is naturally USED, STORED, or FOUND in real life, based on what the product IS and who the target customers are. Examples: a food-storage jar or spice container → a home kitchen counter, pantry shelf, or small food-stall (warung) prep table; a beverage bottle → a drinks table or kitchen; a gym bottle → a gym; skincare → a vanity or bathroom shelf.
- The scene MUST be that natural usage environment. Do NOT default to a coffee shop / cafe / restaurant unless the product genuinely belongs there. A wrong location makes the whole ad feel fake even if the lighting is perfect.

Create a FRESH scene in that environment: ${pick(ANGLES)} Lighting mood: ${pick(MOODS)}
- Prefer INDOOR settings with warm ambient lighting - NOT harsh daylight.
- Use professional lighting: soft key light + gentle fill. Rich warm shadows, not flat.
- Shallow depth of field (f/1.8): product sharp, background creamy bokeh.

STEP 4 - PHOTOREALISTIC INTEGRATION (make it ONE real photograph, not a composite):
The whole image must look like a SINGLE photo taken by ONE camera with ONE lighting setup — never a collage, a cut-out, or a sticker pasted onto a background.
- ONE light source: decide the scene's main light (its direction, softness, and color temperature), then light the product from that SAME direction, with the SAME softness and warmth. The product must never look lit differently from its surroundings.
- Grounding: the product physically RESTS on the surface — a soft contact shadow directly beneath it PLUS a cast shadow pointing the SAME direction as every other shadow in the scene, with ambient occlusion where it meets the surface. It must not float or hover.
- Perspective & scale: shoot the product from the SAME camera height and lens as the scene; its base sits flat on the surface plane (correct perspective, not tilted), and its size is realistic next to nearby objects.
- Optics match: SAME depth of field and bokeh — if the background is soft, the product's far edges also fall off gently (no razor-sharp cut-out against blur). Same lens character and focus falloff.
- Colour & texture unity: the product picks up subtle colour bounce and reflections from the scene, and the surface shows a faint reflection of the product; use identical white balance, colour grade, grain, and micro-contrast across product and background.
- Edges: soft, natural contact edges — absolutely NO hard outline, halo, glow, or fringe around the product.

STEP 5 - FRAMING (fill the whole frame):
- The scene MUST fill the ENTIRE frame edge-to-edge. NO empty margins, NO blank/plain areas, NO black or white bars, NO border/padding.
- The scene MUST fill the ENTIRE frame edge-to-edge, top to bottom, with real scene content — absolutely NO plain, empty, dimmed, blurred-solid, or "calm" band anywhere, especially at the bottom. The photo must be a hard-edged rectangle reaching every corner — NEVER add a rounded corner, vignette, decorative frame/border shape, or any curved cutout at any edge or corner. NEVER reserve or clear space for text: our system overlays text separately later, and it handles readability itself. The bottom of the frame must be just as rich and detailed as the rest of the scene.

FINAL CHECK: before finishing, ask yourself "does this look like ONE real photograph, or like a product pasted onto a background?" If it looks pasted, fix the light direction, the grounding/contact shadow, and the edge blending until it reads as a single genuine photo.

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

Photorealistic (NOT illustration/cartoon). Do NOT add any text, logos, or watermarks. The scene MUST fill the ENTIRE frame edge-to-edge, top to bottom, with real scene content — absolutely NO plain, empty, dimmed, blurred-solid, or "calm" band anywhere, especially at the bottom. The photo must be a hard-edged rectangle reaching every corner — NEVER add a rounded corner, vignette, decorative frame/border shape, or any curved cutout at any edge or corner. NEVER reserve or clear space for text: our system overlays text separately later, and it handles readability itself. The bottom of the frame must be just as rich and detailed as the rest of the scene.

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

Photorealistic, warm professional lighting. Remove phone watermarks / date stamps / added overlay text if present. Do NOT add any new text, logos, or branding. The scene MUST fill the ENTIRE frame edge-to-edge, top to bottom, with real scene content — absolutely NO plain, empty, dimmed, blurred-solid, or "calm" band anywhere, especially at the bottom. The photo must be a hard-edged rectangle reaching every corner — NEVER add a rounded corner, vignette, decorative frame/border shape, or any curved cutout at any edge or corner. NEVER reserve or clear space for text: our system overlays text separately later, and it handles readability itself. The bottom of the frame must be just as rich and detailed as the rest of the scene.

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
- The screenshot MUST sit INSIDE the device's actual physical screen area — it fills the screen bezel-to-bezel exactly, from edge to edge of the real display, matching the device's exact tilt, rotation, and perspective in the scene. NEVER float the screenshot as a flat rectangle disconnected from the device, and NEVER leave visible empty/blank screen space around it.
- The device screen MUST face the CAMERA / viewer directly, so the screenshot is fully visible, UPRIGHT, and readable to us. NEVER mirror, flip, reverse, or rotate the screenshot. NEVER show the screen from the back or angled away from the viewer.
- The person holds/tilts the device so its screen points TOWARD the camera (like showing it to us) — do NOT show them looking at a screen that faces away from us.
- Display the given screenshot EXACTLY as-is on the screen — undistorted, sharp, correctly oriented (never backwards/mirrored), warped to match the screen's exact perspective (not a flat overlay).
- Add realistic screen light: the screenshot's glow/reflection must match the scene's actual light source and direction (window light, room light, etc.) — the screen should look like it is genuinely emitting light onto nearby surfaces (hands, desk, face), not pasted on top of the photo.
- Do NOT redraw, restyle, crop, mirror, or add/remove any text or element inside the screenshot UI. Keep the interface identical and readable.

PERSON & SCENE:
- The person interacts naturally (looking at, pointing to, or holding the device), engaged and positive — like a happy user.
- Person + device are the clear focus. Environment fits the target market (office, cafe, or home per context), warm professional lighting, shallow depth of field (soft background).
- Remove any phone watermarks / date stamps / added overlay text if present.

Business context: Industry ${profile.business.industry || "-"}, Location ${profile.business.location || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.

Do NOT add any new text, logos, or branding to the scene. The scene MUST fill the ENTIRE frame edge-to-edge, top to bottom, with real scene content — absolutely NO plain, empty, dimmed, blurred-solid, or "calm" band anywhere, especially at the bottom. The photo must be a hard-edged rectangle reaching every corner — NEVER add a rounded corner, vignette, decorative frame/border shape, or any curved cutout at any edge or corner. NEVER reserve or clear space for text: our system overlays text separately later, and it handles readability itself. The bottom of the frame must be just as rich and detailed as the rest of the scene.

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
- If this mentions WHERE it is used (face, cheeks, hands, lips, hair, under-eyes, neck, body, skin, etc.), show the product in relation to THAT body part — but choose the SIMPLEST composition that stays anatomically coherent. Prefer ONE of these (pick whichever is safest to render correctly):
  (a) a close-up of just a hand/fingertip applying or holding the product near the body part (no second person's head needed), OR
  (b) a single person clearly showcasing the RESULT (already-applied, finished look) beside the product, NOT a mid-action "someone else applying it to them" shot.
- CRITICAL ANATOMICAL RULES (this scene has failed before with disconnected/impossible bodies): if a person's head or face appears anywhere in the frame, it MUST be FULLY visible and NOT cropped/cut off at the top or any edge of the frame. Every hand shown MUST be clearly and correctly attached to a visible arm belonging to a real, single, coherent body — NEVER a floating/disembodied hand, and NEVER hair or body parts that appear disconnected from the head/scalp they belong to. If you cannot render two coordinated people (one applying, one receiving) with correct anatomy, default to composition (a) or (b) above instead.
- The PRODUCT itself stays the clear hero: sharp, well-lit, label readable.`
    : "\n\nNo usage described: present the product elegantly on a clean premium surface (soft marble, silk, or with subtle botanicals/water droplets).";
  return `This image is a BEAUTY / SKINCARE / cosmetic product. Create a clean, PREMIUM, high-end beauty advertising image.

PRODUCT PRESERVATION: keep the product EXACTLY as photographed — its shape, colors, and every text/label printed on it. Do NOT redraw or restyle it.

STYLE: clean, minimal, premium, spa-like and hygienic. Soft diffused lighting, elegant neutral or soft pastel tones, dewy fresh feel on skin, shallow depth of field. Looks like a luxury cosmetic commercial. SURFACE: use a MATTE or softly-lit surface (fabric, soft-focus marble, wood, or blurred background) — do NOT use a glossy/mirror-like surface that would visibly reflect the product or its text upside-down; reflections of text/labels tend to render as distorted, garbled duplicates and must be avoided entirely.${usageNote}

Business context: Industry ${profile.business.industry || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.

Remove phone watermarks / date stamps / added overlay text if present. Do NOT add any new text, logos, or branding to the scene. The scene MUST fill the ENTIRE frame edge-to-edge, top to bottom, with real scene content — absolutely NO plain, empty, dimmed, blurred-solid, or "calm" band anywhere, especially at the bottom. The photo must be a hard-edged rectangle reaching every corner — NEVER add a rounded corner, vignette, decorative frame/border shape, or any curved cutout at any edge or corner. NEVER reserve or clear space for text: our system overlays text separately later, and it handles readability itself. The bottom of the frame must be just as rich and detailed as the rest of the scene.

RESULT CHECK — both must be true: (1) the dish is pixel-recognizably the SAME dish as the input, and (2) the background, lighting, and composition are CLEARLY improved — returning the input unchanged or nearly unchanged is also a FAILED result.

${localeSceneNote(lang)}`;
}

/**
 * Untuk kategori MAKANAN / MINUMAN. Gaya food photography yang menggugah selera.
 * Dipakai HANYA di Otomatis (di manual, makanan = produk biasa).
 */
export function buildReferencePrompt(profile: BusinessProfile, description?: string, lang?: Lang): string {
  const desc = (description ?? "").trim();
  const note = desc ? `\n\nProduct note from user: "${desc}".` : "";
  return `You are given TWO images:
- IMAGE 1 = the PRODUCT to feature (the real product to keep).
- IMAGE 2 = a STYLE REFERENCE (an example of the look/composition/mood the user wants).

Create ONE new, professional photograph of the PRODUCT from IMAGE 1, styled after the CONCEPT of IMAGE 2. Adopt from the reference: composition & framing, camera angle & distance, background style & surface, lighting direction & mood, colour palette, depth of field, and overall vibe. Recreate ONLY the decorative elements and props that ACTUALLY APPEAR in the reference (for example cobwebs, scattered fruit, sauce drips) and keep them at the SAME modest amount and placement. Do NOT invent extra props, smoke, sparkles, plants, or effects that are not in the reference, and do NOT make the scene busier than the reference. Place ALL props and decorations in the BACKGROUND and around the product ONLY — never on, over, inside, or covering the product itself.

KEEP from IMAGE 1 (do not change): the exact product — its shape, colours, materials, and any label / logo / printed text on the product itself. The product must stay CLEAN and UNOBSTRUCTED: no cobwebs, smoke, sauce, sparkles, or props on top of, wrapped around, or covering it. Never swap it for a different product. The product is the clear hero; decorations only support it from the background.

The ONLY things you must NOT copy from the reference are its TEXT, headline, price, date, caption, watermark, and brand LOGO (that is branding, not style). Everything else about its look — background, colours, props, and decorative effects (cobwebs, scattered items, splashes, sparkles) — SHOULD carry over. The output image itself must contain NO added text or watermark of its own.

CRITICAL — NO TEXT OVERLAY IN OUTPUT (this is the #1 mistake to avoid):
The reference image (IMAGE 2) may contain large hero text or headlines at the top and/or bottom of the frame (for example "WHEN IT'S X" at the top, or "ONE IS NEVER ENOUGH" at the bottom, or any brand tagline). You MUST NOT copy this text LAYOUT PATTERN. Do NOT place ANY large text, headline, brand name overlay, tagline, or decorative typography in your output image — not at the top, not at the bottom, not anywhere in the frame.
The ONLY text that is allowed to appear in your output is text that is PHYSICALLY PRINTED on the product's body from IMAGE 1 (like a product label on the packaging). Never re-use the product name, brand name, or any words from the product label as an overlay headline elsewhere in the frame — the label stays ONLY where it is on the product.
If the reference has a bold hero headline in that position, LEAVE THAT AREA EMPTY of any overlay text in your output. Our system adds text separately later; do not pre-fill it.

FINAL SANITY CHECK (before outputting):
Scan the image top to bottom. Is there ANY text visible that is NOT physically printed on the product's body? Titles, headlines, brand names as overlays, taglines, phone/date stamps, watermarks — anything? If yes: REMOVE it. Output only the product with its own printed label + the new scene, with ZERO additional text overlays.

Business context: Industry ${profile.business.industry || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.${note}

The scene MUST fill the ENTIRE frame edge-to-edge, top to bottom, with real scene content — absolutely NO plain, empty, dimmed, blurred-solid, or "calm" band anywhere, especially at the bottom. The photo must be a hard-edged rectangle reaching every corner — NEVER add a rounded corner, vignette, decorative frame/border shape, or any curved cutout at any edge or corner. NEVER reserve or clear space for text: our system overlays text separately later, and it handles readability itself. The bottom of the frame must be just as rich and detailed as the rest of the scene. The result must look like a real, high-quality photograph — clearly more polished than a phone snapshot.

${localeSceneNote(lang)}`;
}

export function buildFoodPrompt(profile: BusinessProfile, description?: string, lang?: Lang): string {
  const desc = (description ?? "").trim();
  const dishNote = desc ? `\n\nThe user described this as: "${desc}". Keep it that exact dish/drink.` : "";
  return `This image is FOOD or a DRINK. RE-SHOOT it as a professional, mouth-watering FOOD PHOTOGRAPH. The result MUST look clearly and noticeably more polished than the original phone snapshot — this is a professional makeover, NOT a copy of the input.

KEEP (the dish identity) — HARDEST RULE, never break it: the actual food/drink itself must stay EXACTLY the same dish — same ingredients, same toppings and their placement, same portions, same bowl/plate/packaging, same real colors. Do NOT swap it for a different or "nicer" version of the dish, do NOT add/remove/rearrange ingredients or garnish, do NOT change the container. If you are ever unsure whether something belongs to the dish, KEEP it unchanged. Preserve any packaging/label text on the product. A result showing different food than the input is a FAILED result.

TRANSFORM (make it look professionally shot):
- Background: REPLACE or clean away any distracting, messy, or cluttered surroundings (bottles, signage, random objects, busy kitchen/warung background) with a clean, tasteful food-photography setting — rustic wood, marble, or a soft neutral surface with a gently blurred, cohesive backdrop. The background should never compete with the food.
- Lighting: studio-quality, warm and directional, that makes the food pop with appetizing highlights and soft shadows.
- Composition: close-up, appetizing angle (about 45 degrees, or top-down if it suits the dish), sharp focus on the food with shallow depth of field.
- Freshness cues ONLY where natural: gentle steam for hot food, condensation for cold drinks, glossy sauce sheen, fresh garnish — subtle and realistic, never overdone.
- Enhance texture, freshness, and colour richness so it looks freshly served and irresistible.

Business context: Industry ${profile.business.industry || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.${dishNote}

Remove phone watermarks / date stamps / added overlay text if present. Do NOT add any new text, logos, or branding to the scene. The scene MUST fill the ENTIRE frame edge-to-edge, top to bottom, with real scene content — absolutely NO plain, empty, dimmed, blurred-solid, or "calm" band anywhere, especially at the bottom. The photo must be a hard-edged rectangle reaching every corner — NEVER add a rounded corner, vignette, decorative frame/border shape, or any curved cutout at any edge or corner. NEVER reserve or clear space for text: our system overlays text separately later, and it handles readability itself. The bottom of the frame must be just as rich and detailed as the rest of the scene.

RESULT CHECK — both must be true: (1) the dish is pixel-recognizably the SAME dish as the input, and (2) the background, lighting, and composition are CLEARLY improved — returning the input unchanged or nearly unchanged is also a FAILED result.

${localeSceneNote(lang)}`;
}

/**
 * GABUNG PRODUK — prompt untuk menggabung 2–5 foto produk jadi 1 frame.
 * `descriptions` = deskripsi tiap produk (urut sesuai foto yang dikirim).
 */
export function buildGabungPrompt(profile: BusinessProfile, descriptions: string[], lang?: Lang): string {
  const list = descriptions
    .map((d, i) => `  ${i + 1}. ${d && d.trim() ? d.trim() : "(tanpa deskripsi)"}`)
    .join("\n");
  return `You are a world-class commercial product photographer. You are given ${descriptions.length} separate product photos.

TASK — combine them into ONE cohesive image:
- From EACH photo, detect and keep ONLY the MAIN product. Ignore the original background, props, hands, clutter, and any surrounding items.
- Preserve each product EXACTLY as photographed: same shape, colors, and any packaging/label text. Do NOT invent, redesign, or swap products.
- Arrange all ${descriptions.length} products together in a single frame as a clean, tasteful product line-up — balanced composition, consistent scale and perspective, unified soft studio lighting, and one simple complementary background that suits the brand.
- Make it look like a single professionally-shot catalog / social-feed hero image, not a collage or a grid of pasted cut-outs. No visible seams, no hard outlines or halos around any product.
- ONE light source for all products (same direction, softness, warmth). Each product physically RESTS on the surface with a soft contact shadow and cast shadows all pointing the SAME direction, plus subtle reflections on the surface. Relight every product to match this shared lighting so none looks pasted.

Products in the photos (in order):
${list}

Business context: Industry ${profile.business.industry || "-"}, Target customers ${profile.offering.targetCustomer || "-"}.

Remove phone watermarks / date stamps / pre-existing overlay text. Do NOT add any new text, logos, or branding. The scene MUST fill the ENTIRE frame edge-to-edge, top to bottom, with real scene content — absolutely NO plain, empty, dimmed, blurred-solid, or "calm" band anywhere, especially at the bottom. The photo must be a hard-edged rectangle reaching every corner — NEVER add a rounded corner, vignette, decorative frame/border shape, or any curved cutout at any edge or corner. NEVER reserve or clear space for text: our system overlays text separately later, and it handles readability itself. The bottom of the frame must be just as rich and detailed as the rest of the scene.

${localeSceneNote(lang)}`;
}
/**
 * Prompt khusus konten JASA — TIDAK mengubah foto jadi scene baru.
 * Foto jasa (interior, hasil kerja, suasana tempat) cukup DIPOLES pencahayaannya
 * biar enak dipandang, TANPA menata ulang / mengganti latar / memindah objek.
 * (Sesuai masukan: untuk Jasa jangan diubah jadi sesuatu yang berbeda.)
 */
export function buildJasaPrompt(profile: BusinessProfile, lang?: Lang): string {
  return `You are a professional photo retoucher. You are given a real photo from a service business (interior, workspace, a finished result, or the place itself). Your job is to make it look more pleasant WITHOUT changing what it shows.

DO:
- Improve LIGHTING & EXPOSURE: fix dark/flat/uneven light so it looks warm, clean, and inviting. Balance highlights and shadows, lift shadows gently, add natural depth.
- Improve COLOR: correct white balance, remove ugly color casts, make colors natural and appealing (not oversaturated).
- Gentle cleanup only: remove overlaid camera/phone watermarks, date/time stamps, model names (e.g. "REDMI Note 13"), and floating text that is NOT physically part of the scene.
- Keep it looking like a REAL, believable photo of the SAME place/result.

DO NOT (critical):
- Do NOT replace or regenerate the background or scene.
- Do NOT move, add, remove, resize, or restyle objects, furniture, walls, or people.
- Do NOT change the composition, layout, or what the photo depicts.
- Do NOT turn it into a studio/stock look. It must remain the user's own photo, just better lit.

Business context (for tasteful tone only, do NOT add props): ${profile.business.industry || "-"}, ${profile.offering.mainProducts || "-"}.

${localeSceneNote(lang)}`;
}

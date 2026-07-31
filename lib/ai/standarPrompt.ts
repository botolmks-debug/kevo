/**
 * Prompt untuk model "Konten Standar": AI meng-edit gambar yang dipilih user
 * berdasarkan JUDUL + DESKRIPSI yang ditulis user (bukan caption otomatis).
 * Dipakai hanya bila gambar ber-usage "olah_ai".
 */
export function buildStandarImagePrompt(judul: string, descriptions: string[]): string {
  const desc = descriptions.map((d) => d.trim()).filter(Boolean).join(" ");

  return `You are a world-class commercial photographer and designer editing an uploaded image.

STEP 1 - PRESERVE THE MAIN SUBJECT:
Keep the main product/subject in the image EXACTLY as-is: shape, proportions, colors, and any text/label PHYSICALLY PRINTED on its surface must stay perfectly intact and readable. Do NOT redraw, restyle, or distort it.

STEP 2 - CLEANUP:
Remove the original background and ANY overlaid text that is NOT physically printed on the subject - camera/phone watermarks (e.g. "Shot on ...", phone brand/model names), date/time stamps, promo text, stickers, URLs. The result must be free of leftover floating text.

STEP 3 - NEW SCENE FROM THE USER'S TEXT:
Build a fresh background/scene whose mood, setting, props, and color palette MATCH the meaning of this content:
- Judul: ${judul || "-"}
- Deskripsi: ${desc || "-"}
Use realistic, professional, warm indoor lighting with soft depth of field unless the text clearly implies another setting.

STEP 4 - INTEGRATION & FRAMING:
Relight the subject to match the new scene, add a natural contact shadow and ambient occlusion, and blend the edges (no cut-out outline/halo). The scene MUST fill the ENTIRE frame edge-to-edge - no empty margins, no black/white bars, no border. Keep the lower third a bit calmer for text, but it must still contain scene/background, never left blank.

Do NOT add any new text, letters, numbers, logos, or watermarks to the image.`;
}
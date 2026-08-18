export type Lang = "id" | "en";

/** Instruksi bahasa output untuk prompt teks (judul & caption). */
export function outputLangDirective(lang?: Lang): string {
  return lang === "en"
    ? "IMPORTANT - OUTPUT LANGUAGE: write onImageText (headline) and caption in NATURAL, IDIOMATIC ENGLISH — the way a native English-speaking social media marketer would actually write, casual and engaging. Do NOT translate word-for-word from Indonesian and do NOT use stiff, formal, or textbook phrasing. Use natural contractions and everyday wording. The format notes below may be in Indonesian, but the RESULTING headline & caption MUST be fluent English."
    : "BAHASA OUTPUT: Bahasa Indonesia.";
}

/**
 * Instruksi lokalisasi VISUAL (orang & lingkungan) untuk prompt GAMBAR.
 * Bahasa Indonesia dipilih -> orang & suasana bergaya Indonesia/Asia Tenggara.
 * English dipilih -> orang & suasana bergaya global/internasional.
 */
export function localeSceneNote(lang?: Lang): string {
  if (lang === "en")
    return "LOCALE: any people shown should have a diverse, global/international appearance (not tied to one specific ethnicity), and the environment/setting should feel broadly international — suitable for a worldwide English-speaking audience. Avoid making it look specifically Indonesian/Southeast Asian.";

  // Nuansa Indonesia lewat KONTEKS sehari-hari (orang, cahaya, ruang), BUKAN
  // ornamen tradisional yang ditempel ke tiap gambar. Batik dsb hanya sesekali
  // (~1 dari 10) supaya feed tidak terasa "batik terus".
  const base =
    "LOCALE: orang yang tampil (kalau ada) terlihat Indonesia/Asia Tenggara, dan suasananya terasa Indonesia lewat KONTEKS sehari-hari yang wajar (orang, ruang, cahaya hangat, benda keseharian) yang sesuai jenis usahanya — bukan gaya foto stok Barat/global yang generik.";
  const avoidOrnament =
    " PENTING: JANGAN menempelkan ornamen tradisional yang mencolok sebagai latar/properti (batik, wayang, ukiran, songket, tenun, gebyok) — hindari di gambar ini. Cukup nuansa Indonesia modern & sehari-hari.";
  const allowOrnament =
    " Boleh SESEKALI ada sentuhan ornamen tradisional halus (mis. motif batik) HANYA jika benar-benar cocok dgn jenis usahanya, tampil natural, kecil, dan tidak berlebihan.";
  return base + (Math.random() < 0.1 ? allowOrnament : avoidOrnament);
}

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
  return lang === "en"
    ? "LOCALE: any people shown should have a diverse, global/international appearance (not tied to one specific ethnicity), and the environment/setting should feel broadly international — suitable for a worldwide English-speaking audience. Avoid making it look specifically Indonesian/Southeast Asian."
    : "LOCALE: orang yang tampil (kalau ada) harus terlihat Indonesia/Asia Tenggara, dan lingkungan/suasana harus terasa khas Indonesia (arsitektur, dekorasi, konteks sehari-hari lokal) yang sesuai jenis usahanya — bukan gaya foto stok Barat/global yang generik.";
}

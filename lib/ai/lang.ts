export type Lang = "id" | "en";

/** Instruksi bahasa output untuk prompt teks (judul & caption). */
export function outputLangDirective(lang?: Lang): string {
  return lang === "en"
    ? "IMPORTANT - OUTPUT LANGUAGE: write onImageText (headline) and caption in NATURAL, IDIOMATIC ENGLISH — the way a native English-speaking social media marketer would actually write, casual and engaging. Do NOT translate word-for-word from Indonesian and do NOT use stiff, formal, or textbook phrasing. Use natural contractions and everyday wording. The format notes below may be in Indonesian, but the RESULTING headline & caption MUST be fluent English."
    : "BAHASA OUTPUT: Bahasa Indonesia.";
}

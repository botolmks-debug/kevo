export type Lang = "id" | "en";

/** Instruksi bahasa output untuk prompt teks (judul & caption). */
export function outputLangDirective(lang?: Lang): string {
  return lang === "en"
    ? "IMPORTANT - OUTPUT LANGUAGE: write onImageText (headline) and caption in natural, fluent ENGLISH. Format notes below may be written in Indonesian, but the RESULTING text (headline & caption) MUST be in English."
    : "BAHASA OUTPUT: Bahasa Indonesia.";
}

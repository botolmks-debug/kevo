export type FontOption = {
  id: string;
  label: string;
  family: string;
  fileName: string;
  style: "sans" | "serif" | "display" | "script";
};

export const FONT_OPTIONS: FontOption[] = [
  { id: "inter",         label: "Inter",          family: "Inter",            fileName: "Inter-Bold.ttf",            style: "sans" },
  { id: "poppins",       label: "Poppins",         family: "Poppins",          fileName: "Poppins-Bold.ttf",          style: "sans" },
  { id: "pt-sans",       label: "PT Sans",         family: "PT Sans",          fileName: "PTSans-Bold.ttf",           style: "sans" },
  { id: "varela-round",  label: "Varela Round",    family: "Varela Round",     fileName: "VarelaRound-Regular.ttf",   style: "sans" },
  { id: "crimson-text",  label: "Crimson Text",    family: "Crimson Text",     fileName: "CrimsonText-Bold.ttf",      style: "serif" },
  { id: "pt-serif",      label: "PT Serif",        family: "PT Serif",         fileName: "PTSerif-Bold.ttf",          style: "serif" },
  { id: "abril-fatface", label: "Abril Fatface",   family: "Abril Fatface",    fileName: "AbrilFatface-Regular.ttf",  style: "display" },
  { id: "bebas-neue",    label: "Bebas Neue",      family: "Bebas Neue",       fileName: "BebasNeue-Regular.ttf",     style: "display" },
  { id: "fjalla-one",    label: "Fjalla One",      family: "Fjalla One",       fileName: "FjallaOne-Regular.ttf",     style: "display" },
  { id: "pacifico",      label: "Pacifico",        family: "Pacifico",         fileName: "Pacifico-Regular.ttf",      style: "script" },
  { id: "dm-serif",      label: "DM Serif",        family: "DM Serif Display", fileName: "DMSerifDisplay-Regular.ttf",style: "serif" },
  { id: "righteous",     label: "Righteous",       family: "Righteous",        fileName: "Righteous-Regular.ttf",     style: "display" },
  { id: "lobster",       label: "Lobster",         family: "Lobster",          fileName: "Lobster-Regular.ttf",       style: "script" },
  { id: "oswald",        label: "Oswald",          family: "Oswald",           fileName: "Oswald-Bold.ttf",           style: "display" },

  { id: "raleway",       label: "Raleway",          family: "Raleway",          fileName: "Raleway-Bold.ttf",          style: "sans" },
  { id: "barlow",        label: "Barlow",           family: "Barlow",           fileName: "Barlow-Bold.ttf",           style: "sans" },
  { id: "nunito-sans",   label: "Nunito Sans",      family: "Nunito Sans",      fileName: "NunitoSans-Bold.ttf",       style: "sans" },
  // Helvetica asli berbayar/berlisensi (tidak boleh dibundel-ulang) — dipakai
  // Arimo (open-source, metric-compatible dengan Helvetica/Arial) sebagai
  // pengganti drop-in yang tampilannya nyaris identik.
  { id: "helvetica",     label: "Helvetica",        family: "Arimo",            fileName: "Arimo-Bold.ttf",            style: "sans" },

  // Uncomment setelah file .ttf-nya ada di public/fonts/:
  // { id: "nunito",     label: "Nunito",           family: "Nunito",           fileName: "Nunito-Bold.ttf",           style: "sans" },
  // { id: "rubik",      label: "Rubik",            family: "Rubik",            fileName: "Rubik-Bold.ttf",            style: "sans" },

  // === 10 font baru (populer di desain konten sosmed/Canva-style & "viral"
  // di IG/TikTok) — file .ttf-nya BELUM ada di public/fonts/, jalankan dulu
  // scripts/fetch-google-font.mjs untuk masing-masing (lihat PANDUAN-FONT-BARU.md),
  // baru uncomment entry di bawah setelah filenya ada.
  { id: "montserrat",       label: "Montserrat",         family: "Montserrat",         fileName: "Montserrat-Bold.woff",        style: "sans" },
  { id: "plus-jakarta",     label: "Plus Jakarta Sans",  family: "Plus Jakarta Sans",  fileName: "PlusJakartaSans-Bold.woff",   style: "sans" },
  { id: "space-grotesk",    label: "Space Grotesk",      family: "Space Grotesk",      fileName: "SpaceGrotesk-Bold.woff",      style: "sans" },
  { id: "anton",            label: "Anton",              family: "Anton",              fileName: "Anton-Regular.woff",          style: "display" },
  { id: "archivo-black",    label: "Archivo Black",      family: "Archivo Black",      fileName: "ArchivoBlack-Regular.woff",   style: "display" },
  { id: "unbounded",        label: "Unbounded",          family: "Unbounded",          fileName: "Unbounded-Bold.woff",         style: "display" },
  { id: "caveat",           label: "Caveat",             family: "Caveat",             fileName: "Caveat-Bold.woff",            style: "script" },
  { id: "instrument-serif", label: "Instrument Serif",   family: "Instrument Serif",   fileName: "InstrumentSerif-Regular.woff",style: "serif" },
  { id: "libre-baskerville",label: "Libre Baskerville",  family: "Libre Baskerville",  fileName: "LibreBaskerville-Bold.woff",  style: "serif" },
  { id: "bricolage",        label: "Bricolage Grotesque",family: "Bricolage Grotesque",fileName: "BricolageGrotesque-Bold.woff",style: "display" },
  // { id: "playfair",   label: "Playfair Display", family: "Playfair Display", fileName: "PlayfairDisplay-Bold.ttf",  style: "serif" },
  // { id: "lora",       label: "Lora",             family: "Lora",             fileName: "Lora-Bold.ttf",             style: "serif" },
  // { id: "satisfy",    label: "Satisfy",          family: "Satisfy",          fileName: "Satisfy-Regular.ttf",       style: "script" },
];

export const DEFAULT_FONT_ID = "inter";

export function findFontOption(id: string): FontOption | undefined {
  return FONT_OPTIONS.find((f) => f.id === id);
}

export function fontIdsByStyle(style: FontOption["style"]): string[] {
  return FONT_OPTIONS.filter((f) => f.style === style).map((f) => f.id);
}
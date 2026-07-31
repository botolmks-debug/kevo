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

  // Uncomment setelah file .ttf-nya ada di public/fonts/:
  // { id: "raleway",    label: "Raleway",          family: "Raleway",          fileName: "Raleway-Bold.ttf",          style: "sans" },
  // { id: "nunito",     label: "Nunito",           family: "Nunito",           fileName: "Nunito-Bold.ttf",           style: "sans" },
  // { id: "rubik",      label: "Rubik",            family: "Rubik",            fileName: "Rubik-Bold.ttf",            style: "sans" },
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
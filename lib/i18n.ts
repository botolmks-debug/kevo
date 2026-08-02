export type Lang = "id" | "en";

export function getLang(): Lang {
  if (typeof window === "undefined") return "id";
  return window.localStorage.getItem("kevo_lang") === "en" ? "en" : "id";
}

export function setLang(lang: Lang): void {
  if (typeof window !== "undefined") window.localStorage.setItem("kevo_lang", lang);
}

// Kamus UI. Fase 1: menu navigasi + label toggle. Diperluas bertahap.
const DICT: Record<string, { id: string; en: string }> = {
  "nav.dashboard": { id: "Dashboard", en: "Dashboard" },
  "nav.buatKonten": { id: "Buat Konten", en: "Create" },
  "nav.otomatis": { id: "Otomatis", en: "Auto" },
  "nav.editKonten": { id: "Edit Konten", en: "Edit" },
  "nav.jadwal": { id: "Jadwal", en: "Schedule" },
  "nav.admin": { id: "Admin", en: "Admin" },
  "nav.keluar": { id: "Keluar", en: "Log out" },
  "lang.title": { id: "Bahasa", en: "Language" },
  "lang.desc": {
    id: "Bahasa hasil generate (judul & caption). Indonesia atau English.",
    en: "Language of generated content (title & caption). Indonesian or English.",
  },
};

export function t(key: string, lang: Lang): string {
  return DICT[key]?.[lang] ?? key;
}

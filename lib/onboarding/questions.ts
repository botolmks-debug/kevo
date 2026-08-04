// SUMBER TUNGGAL daftar pertanyaan onboarding.
// Panel Admin ("Pertanyaan Onboarding") membaca dari file ini — jadi kalau
// kamu mengubah onboarding, cukup update daftar di sini dan panel Admin ikut
// otomatis. (Form onboarding tetap file terpisah karena tiap input beda jenis;
// saat menamb/menghapus pertanyaan di form, sinkronkan daftar ini juga.)

export type OnboardingQuestion = {
  group: string;
  field: string;
  label: string;
  input?: string;
  note?: string;
};

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  { group: "Bisnis", field: "business.name", label: "Nama usaha", input: "teks" },
  { group: "Bisnis", field: "business.industry", label: "Industri / jenis usaha", input: "dropdown + Lainnya" },
  { group: "Bisnis", field: "business.location", label: "Lokasi / area layanan", input: "teks" },

  { group: "Penawaran", field: "offering.mainProducts", label: "Produk / jasa utama", input: "teks" },
  { group: "Penawaran", field: "offering.targetCustomer", label: "Target pelanggan", input: "teks" },
  { group: "Penawaran", field: "offering.customerProblem", label: "Masalah pelanggan yang diselesaikan", input: "teks panjang" },

  { group: "Positioning", field: "positioning.differentiator", label: "Keunggulan / pembeda", input: "teks panjang" },
  { group: "Positioning", field: "positioning.contentGoals", label: "Tujuan konten", input: "pilihan ganda", note: "jualan / brand awareness / edukasi / loyalitas" },
  { group: "Positioning", field: "positioning.tone", label: "Nada komunikasi (tone)", input: "pilihan", note: "santai / profesional / hangat / lucu / formal" },
  { group: "Positioning", field: "positioning.cta", label: "Call to action (CTA)", input: "teks panjang" },
  { group: "Positioning", field: "positioning.avoid", label: "Hal yang dihindari", input: "chip/tag (Enter/koma)", note: "opsional" },

  { group: "Lainnya", field: "socials", label: "Sosial media", input: "isian + centang tampil" },
  { group: "Lainnya", field: "story", label: "Cerita usaha", input: "teks panjang" },
];

/**
 * FULL DESIGN PIPELINE
 * ---------------------
 * Menggantikan pendekatan Art Director sebelumnya (anchor + icon terpisah).
 * Sekarang: Gemini desain SATU gambar lengkap (judul+subjudul+badge dibakar
 * langsung, kreatif bebas), divalidasi ejaannya (retry 1x kalau typo), lalu
 * cuma perlu ditempel logo+footer — TIDAK ADA lagi overlay teks/badge terpisah.
 */

import { editImage } from "./geminiImage";
import { buildFullDesignPrompt } from "./fullDesignPrompt";
import { validateDesignText } from "./validateDesignText";
import { buildFullDesignTemplate } from "../templates/fullDesignTemplate";
import type { BusinessProfile } from "../onboarding/businessProfile";
import type { Template, AspectRatio } from "../templates/types";

export interface FullDesignInput {
  profile: BusinessProfile;
  productDescription: string;
  photoBase64: string; // foto produk BERSIH (sudah dipercantik scenePrompt, base64 tanpa prefix)
  photoMimeType: string;
  ratio: AspectRatio;
  lang: "id" | "en";
  /** Judul yang sudah dipilih user dari 5 pilihan — WAJIB dipakai apa adanya oleh Gemini. */
  chosenHeadline?: string;
  callGeminiVision: (prompt: string, imageBase64: string, mimeType: string) => Promise<string>;
}

export interface FullDesignOutput {
  ok: true;
  template: Template;
  values: Record<string, string>;
  finalPhotoDataUri: string;
  validationPassed: boolean; // false = lolos setelah retry gagal juga, dipakai apa adanya (tidak diblokir)
  attempts: number;
}

export interface FullDesignFailure {
  ok: false;
  error: string;
}

const MAX_ATTEMPTS = 2; // 1x generate + 1x retry kalau validasi gagal

export async function runFullDesignPipeline(
  input: FullDesignInput
): Promise<FullDesignOutput | FullDesignFailure> {
  const prompt = buildFullDesignPrompt({
    profile: input.profile,
    productDescription: input.productDescription,
    lang: input.lang,
    chosenHeadline: input.chosenHeadline,
  });

  let lastDataUri: string | null = null;
  let validationPassed = false;
  let attempts = 0;

  const retryReinforcement = input.lang === "en"
    ? "\n\nIMPORTANT — a previous attempt had garbled/misspelled text. This time: keep EVERY piece of text (headline, supporting line, badges) SHORT and SIMPLE (badges max 2-3 words), and re-check the spelling of every single word character-by-character before finalizing. If in doubt, use FEWER words rather than risk a misspelling."
    : "\n\nPENTING — percobaan sebelumnya ada teks yang rusak/salah eja. Kali ini: buat SEMUA teks (judul, kalimat pendukung, badge) PENDEK dan SEDERHANA (badge maksimal 2-3 kata), dan cek ulang ejaan tiap kata huruf-per-huruf sebelum selesai. Kalau ragu, pakai LEBIH SEDIKIT kata daripada berisiko salah eja.";

  for (attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
    const result = await editImage({
      imageBase64: input.photoBase64,
      mimeType: input.photoMimeType,
      aspectRatio: input.ratio,
      prompt: attempts === 1 ? prompt : prompt + retryReinforcement,
    });

    if (!result.ok) {
      // Gagal generate gambar sama sekali -> kalau ini percobaan terakhir, menyerah.
      if (attempts >= MAX_ATTEMPTS) return { ok: false, error: result.error };
      continue;
    }

    lastDataUri = result.dataUri;
    const base64 = result.dataUri.replace(/^data:image\/\w+;base64,/, "");
    const validation = await validateDesignText(base64, "image/png", input.lang, input.callGeminiVision, input.profile.business?.name);

    if (validation.valid) {
      validationPassed = true;
      break;
    }
    console.warn(`[fullDesign] percobaan ${attempts} typo/aneh terdeteksi:`, validation.issues);
    // lanjut loop -> retry sekali lagi (kalau masih ada jatah attempts)
  }

  if (!lastDataUri) return { ok: false, error: "Gagal generate desain setelah beberapa percobaan." };

  // PENTING: kalau validasi ejaan GAGAL TERUS sampai retry habis, JANGAN
  // dipakai — mengirim gibberish (mis. "FLEGA NI") ke konten bisnis user itu
  // lebih buruk daripada fallback ke jalur lama yang 100% aman (font asli,
  // tidak pernah salah eja). Lebih baik "biasa tapi benar" daripada
  // "kreatif tapi rusak".
  if (!validationPassed) {
    return { ok: false, error: `Validasi ejaan gagal setelah ${attempts} percobaan, hasil TIDAK dipakai (cegah kirim teks rusak ke user).` };
  }

  const template = buildFullDesignTemplate();
  const values = { photo: lastDataUri };

  return { ok: true, template, values, finalPhotoDataUri: lastDataUri, validationPassed, attempts };
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tombol "Lanjut dengan Google" — dipakai di /signup dan /login.
 * Memicu OAuth Supabase; setelah user pilih akun Google, Supabase mengarahkan
 * balik ke /auth/callback (lihat route itu) yang menukar code jadi sesi.
 *
 * PRASYARAT (setup dashboard, bukan kode): provider Google harus AKTIF di
 * Supabase (Authentication > Providers > Google) dengan Client ID & Secret
 * dari Google Cloud Console. Tanpa itu, tombol akan error saat diklik.
 */
export function GoogleAuthButton({ label = "Lanjut dengan Google" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("Gagal masuk dengan Google. Coba lagi.");
      setLoading(false);
    }
    // Kalau sukses, browser sudah dialihkan ke Google — tak perlu setLoading(false).
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-navy/15 bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-navy/[0.03] disabled:opacity-60"
      >
        {/* Logo Google (inline SVG, tak perlu file) */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        {loading ? "Menghubungkan..." : label}
      </button>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}

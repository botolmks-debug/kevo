"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AuthBackground } from "@/components/ui/AuthBackground";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setStatus("loading");
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setStatus("sent");
    // Sengaja TIDAK membedakan pesan sukses/gagal berdasarkan apakah email
    // terdaftar — supaya orang lain tidak bisa "menebak" email mana yang
    // punya akun (privasi). Kalau memang terdaftar, link reset terkirim;
    // kalau tidak, tidak terjadi apa-apa, tapi user tetap lihat pesan sukses.
    if (error) setError(null);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <AuthBackground />
      <Card className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/keposty-icon.png" alt="Keposting" className="h-10 w-10" />
            <span className="text-2xl font-bold text-navy">Keposting</span>
          </div>
          <h1 className="text-2xl font-bold text-navy">Lupa Password</h1>
          <p className="text-center text-sm text-navy/50">Masukkan email akunmu, kami kirim link untuk atur ulang password.</p>
        </div>

        {status === "sent" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-navy/70">
              Kalau <span className="font-semibold text-navy">{email}</span> terdaftar, link atur ulang password sudah
              dikirim. Cek inbox (dan folder spam) kamu.
            </p>
            <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
              ← Kembali ke Masuk
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={status === "loading" || !email} className="w-full">
              {status === "loading" ? "Mengirim..." : "Kirim Link Reset"}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-navy/60">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            ← Kembali ke Masuk
          </Link>
        </p>
      </Card>
    </main>
  );
}

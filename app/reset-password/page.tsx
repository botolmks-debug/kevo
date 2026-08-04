"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AuthBackground } from "@/components/ui/AuthBackground";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Link dari email membawa sesi sementara (recovery session) lewat
    // Supabase — begitu client memuatnya, auth state berubah ke SIGNED_IN.
    // Kita tunggu event ini sebelum menampilkan form supaya tidak submit ke
    // sesi yang belum siap.
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Kalau event sudah lewat sebelum listener terpasang (kadang terjadi),
    // cek juga sesi yang sedang aktif secara langsung.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit() {
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setStatus("loading");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setError(error.message || "Gagal mengatur ulang password.");
      return;
    }
    setStatus("success");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
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
          <h1 className="text-2xl font-bold text-navy">Atur Password Baru</h1>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-navy/50">Memverifikasi link...</p>
        ) : status === "success" ? (
          <p className="text-center text-sm font-medium text-primary">Password berhasil diubah! Mengalihkan...</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col gap-4"
          >
            <Input label="Password baru" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <Input label="Konfirmasi password baru" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={status === "loading" || !password || !confirm} className="w-full">
              {status === "loading" ? "Menyimpan..." : "Simpan Password Baru"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}

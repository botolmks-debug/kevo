"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email atau password salah. Coba lagi.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-sm font-semibold text-accent">Kevo</span>
          <h1 className="mt-1 text-2xl font-bold text-navy">Masuk</h1>
          <p className="mt-1 text-sm text-navy/60">Selamat datang kembali 👋</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="flex flex-col gap-4"
        >
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading || !email || !password} className="w-full">
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-navy/60">
          Belum punya akun?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Daftar
          </Link>
        </p>
      </Card>
    </main>
  );
}
"use client";

import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Tab = "masuk" | "daftar" | "lupa";

const tabs: { id: Tab; label: string }[] = [
  { id: "masuk", label: "Masuk" },
  { id: "daftar", label: "Daftar" },
  { id: "lupa", label: "Lupa Password" },
];

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("masuk");
  const [resetSent, setResetSent] = useState(false);

  return (
    <main className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-center bg-navy px-12 text-white lg:flex">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Kevo</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight">
          Konten brand yang konsisten, jadi dalam hitungan detik.
        </h1>
        <p className="mt-4 max-w-sm text-white/70">
          Satu template, banyak konten. Tanpa desainer, tanpa ribet.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-navy">Selamat datang</h2>

          <div className="mt-6 flex gap-2 rounded-card bg-surface p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setResetSent(false);
                }}
                className={`flex-1 rounded-card px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-white text-primary shadow-sm" : "text-navy/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab !== "lupa" ? (
            <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <Input label="Email" type="email" placeholder="nama@email.com" required />
              <Input label="Password" type="password" placeholder="••••••••" required />
              <LinkButton href="/onboarding" variant="primary" className="mt-2 w-full">
                {tab === "masuk" ? "Masuk" : "Daftar"}
              </LinkButton>
            </form>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              <Input label="Email" type="email" placeholder="nama@email.com" />
              <Button type="button" onClick={() => setResetSent(true)} className="w-full">
                Kirim Tautan Reset
              </Button>
              {resetSent ? (
                <p className="text-sm text-primary">
                  Kalau email itu terdaftar, tautan reset password sudah kami kirim.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

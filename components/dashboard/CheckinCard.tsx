"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/supabase/tokens";

type Turn = { role: "user" | "assistant"; text: string };
type Note = { id: string; note: string; created_at: string };

/** Sapaan personal: nama usaha + konteks waktu, dipilih acak per buka. */
function buildGreeting(businessName: string | null): string {
  const nama = businessName?.trim() ? businessName.trim() : "kak";
  const h = new Date().getHours();
  const waktu = h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam";
  const salam = waktu === "pagi" ? "Pagi" : waktu === "siang" ? "Siang" : waktu === "sore" ? "Sore" : "Malam";
  const pool = [
    `${salam}, ${nama}! ☀️ Gimana kabar usahanya hari ini?`,
    `${salam}, ${nama}! 👋 Ada cerita seru dari toko hari ini?`,
    `${salam}, ${nama}! Lagi sibuk apa nih ${waktu} ini? 😊`,
    `${salam}, ${nama}! Ada yang baru dari bisnismu belakangan ini?`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Popup hanya auto-muncul sekali per sesi browser, biar tidak mengganggu. */
const SESSION_KEY = "checkin-popup-shown";

/**
 * AI Check-in "Ngobrol Bisnis" — TAHAP UJI, hanya untuk akun admin.
 * Gaya ASISTEN VIRTUAL: 2 detik setelah dashboard terbuka, popup meluncur
 * dari kiri-bawah dengan sapaan personal (nama usaha + pagi/siang/sore/
 * malam). Bisa ditutup (X) → menyisakan bubble 💬 untuk dibuka lagi.
 * (Kanan-bawah sudah dipakai widget Bantuan, jadi popup ini di KIRI-bawah.)
 */
export function CheckinCard() {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !isAdmin(data.user?.email)) return;
      setAllowed(true);

      // Nama usaha untuk sapaan personal (best-effort).
      let businessName: string | null = null;
      try {
        const res = await fetch("/api/business-profile");
        const d = await res.json();
        businessName = d?.profile?.business?.name ?? null;
      } catch {
        // pakai sapaan generik
      }
      if (cancelled) return;
      setTurns([{ role: "assistant", text: buildGreeting(businessName) }]);

      fetch("/api/checkin")
        .then((r) => r.json())
        .then((d) => setNotes(d.notes ?? []))
        .catch(() => {});

      // Auto pop-up: delay 2 detik setelah dashboard terbuka, sekali per sesi.
      let alreadyShown = false;
      try {
        alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";
      } catch {
        // sessionStorage tak tersedia → tetap tampil
      }
      if (!alreadyShown) {
        setTimeout(() => {
          if (cancelled) return;
          setOpen(true);
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            // abaikan
          }
        }, 2000);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy, open]);

  if (!allowed) return null;

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setError(null);
    const history = turns;
    setTurns((t) => [...t, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Gagal mengirim.");
      setTurns((t) => [...t, { role: "assistant", text: d.reply as string }]);
      if (d.savedNote) setNotes((n) => [d.savedNote as Note, ...n]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(id: string) {
    setNotes((n) => n.filter((x) => x.id !== id));
    await fetch(`/api/checkin?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  // Bubble pembuka (saat popup tertutup) — kiri bawah.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ngobrol Bisnis"
        className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-lg transition hover:scale-105"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 left-5 z-40 flex w-[min(92vw,360px)] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl animate-[checkin-pop_.35s_ease-out]">
      <style>{`@keyframes checkin-pop{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div className="flex items-center justify-between bg-primary px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">💬</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Ngobrol Bisnis</span>
            <span className="text-[10px] text-white/80">Tahap uji — khusus admin</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-white/25"
          >
            Catatan ({notes.length})
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-lg leading-none text-white/80 hover:text-white"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>
      </div>

      {showNotes ? (
        <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto border-b border-line bg-navy/[0.03] p-3">
          {notes.length === 0 ? (
            <p className="text-xs text-navy/40">Belum ada catatan — mulai dari cerita apa saja.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-2">
                <p className="text-xs text-navy/70">• {n.note}</p>
                <button
                  type="button"
                  onClick={() => deleteNote(n.id)}
                  className="shrink-0 text-[10px] font-medium text-red-500 hover:underline"
                >
                  hapus
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}

      {/* Percakapan */}
      <div ref={scrollRef} className="flex h-64 flex-col gap-2 overflow-y-auto bg-navy/[0.02] p-3">
        {turns.map((t, i) => (
          <div key={i} className={`flex items-end gap-1.5 ${t.role === "user" ? "self-end" : "self-start"}`}>
            {t.role === "assistant" ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs">💬</span>
            ) : null}
            <div
              className={`max-w-[240px] rounded-2xl px-3 py-2 text-sm ${
                t.role === "user" ? "bg-primary text-white" : "border border-line bg-white text-navy"
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="flex items-end gap-1.5 self-start">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs">💬</span>
            <div className="rounded-2xl border border-line bg-white px-3 py-2 text-sm text-navy/40">mengetik...</div>
          </div>
        ) : null}
      </div>

      {error ? <p className="px-3 pb-1 text-xs text-red-600">{error}</p> : null}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-line p-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Tulis cerita atau kabar bisnismu..."
          className="flex-1 rounded-full border border-line px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Kirim
        </button>
      </div>
    </div>
  );
}

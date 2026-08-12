"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/supabase/tokens";

type Message = { role: "user" | "assistant"; content: string; failed?: boolean };
type Note = { id: string; note: string; created_at: string };
type Tab = "checkin" | "support";

/** Sapaan personal Ngobrol Bisnis: nama usaha + konteks waktu, acak. */
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

/**
 * SATU widget chat kanan-bawah dengan dua tab:
 * - "Ngobrol Bisnis" (TAHAP UJI, hanya admin): asisten menyapa personal dan
 *   mendengarkan cerita pemilik; info berguna diringkas jadi catatan bisnis.
 *   AUTO-POPUP sekali per LOGIN (delay 2 detik) — dilacak via
 *   user.last_sign_in_at + localStorage, jadi refresh/pindah halaman tidak
 *   memunculkannya lagi sampai login berikutnya.
 * - "Bantuan": support chat lama (tanya fitur/token + eskalasi ke admin),
 *   perilaku tidak berubah.
 * User biasa hanya melihat Bantuan (tanpa tab, tanpa auto-popup).
 */
export default function SupportWidget() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("support");
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

  // ── State tab Bantuan (support lama, tidak diubah perilakunya) ──────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });
  const [escalating, setEscalating] = useState(false);
  const [escalated, setEscalated] = useState(false);

  // ── State tab Ngobrol Bisnis (check-in) ─────────────────────────────────
  const [ciTurns, setCiTurns] = useState<Message[]>([]);
  const [ciInput, setCiInput] = useState("");
  const [ciBusy, setCiBusy] = useState(false);
  const [ciError, setCiError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNotes, setShowNotes] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Widget hanya muncul kalau user login (endpoint ringan yang sama).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/support/status", { cache: "no-store" })
      .then((r) => {
        if (!cancelled) setVisible(r.ok);
      })
      .catch(() => {
        if (!cancelled) setVisible(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cek admin + siapkan sapaan personal Ngobrol Bisnis.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !isAdmin(data.user?.email)) return;
      setAdminAllowed(true);
      setTab("checkin");
      setLastSignInAt(data.user?.last_sign_in_at ?? null);

      let businessName: string | null = null;
      try {
        const res = await fetch("/api/business-profile");
        const d = await res.json();
        businessName = d?.profile?.business?.name ?? null;
      } catch {
        // pakai sapaan generik
      }
      if (cancelled) return;
      setCiTurns([{ role: "assistant", content: buildGreeting(businessName) }]);
      fetch("/api/checkin")
        .then((r) => r.json())
        .then((d) => setNotes(d.notes ?? []))
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // AUTO-POPUP: sekali per LOGIN (bukan per kunjungan halaman). Supabase
  // mencatat waktu login di user.last_sign_in_at — kalau nilainya berbeda
  // dari yang tersimpan di localStorage, berarti ini login baru → sapa
  // (delay 2 detik), lalu simpan supaya refresh/pindah halaman tidak
  // memunculkannya lagi sampai login berikutnya.
  useEffect(() => {
    if (!adminAllowed || !lastSignInAt) return;
    const KEY = "checkin-greeted-login";
    let greeted: string | null = null;
    try {
      greeted = localStorage.getItem(KEY);
    } catch {
      // localStorage tak tersedia → tetap sapa (paling buruk lebih sering)
    }
    if (greeted === lastSignInAt) return;
    const timer = setTimeout(() => {
      setTab("checkin");
      setOpen(true);
      try {
        localStorage.setItem(KEY, lastSignInAt);
      } catch {
        // abaikan
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [adminAllowed, lastSignInAt]);

  // Auto scroll ke bawah tiap ada pesan baru (kedua tab).
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, ciTurns, ciBusy, tab, open]);

  // Salam pembuka tab Bantuan saat pertama dibuka.
  useEffect(() => {
    if (open && tab === "support" && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hai! Saya asisten Keposting. Ada yang bisa saya bantu? Bisa tanya soal fitur, token, atau troubleshooting.",
        },
      ]);
    }
  }, [open, tab, messages.length]);

  // ── Aksi tab Bantuan (persis logika lama) ───────────────────────────────
  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          history: messages.filter((m) => !m.failed),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.error ?? "Terjadi kesalahan. Coba lagi atau eskalasi ke admin.",
            failed: true,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: json.reply, failed: json.failed }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Gagal menghubungi server. Coba lagi.", failed: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const escalate = async () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) {
      alert("Ketik dulu pertanyaan kamu, baru bisa dieskalasi.");
      return;
    }
    if (!confirm("Kirim percakapan ini ke admin via email? Response dalam 24 jam.")) return;

    setEscalating(true);
    try {
      const res = await fetch("/api/support/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: lastUserMsg.content }),
      });
      const json = await res.json();
      if (res.ok) {
        setEscalated(true);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.note ?? "Terkirim ke admin! Kami akan balas via email dalam 24 jam." },
        ]);
      } else {
        alert(json.error ?? "Gagal mengirim. Coba lagi.");
      }
    } catch {
      alert("Gagal mengirim. Coba lagi.");
    } finally {
      setEscalating(false);
    }
  };

  // ── Aksi tab Ngobrol Bisnis ─────────────────────────────────────────────
  async function sendCheckin(e: FormEvent) {
    e.preventDefault();
    const message = ciInput.trim();
    if (!message || ciBusy) return;
    setCiInput("");
    setCiError(null);
    const history = ciTurns.map((t) => ({ role: t.role, text: t.content }));
    setCiTurns((t) => [...t, { role: "user", content: message }]);
    setCiBusy(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) throw new Error(d?.error ?? "Gagal mengirim.");
      setCiTurns((t) => [...t, { role: "assistant", content: d.reply as string }]);
      if (d.savedNote) setNotes((n) => [d.savedNote as Note, ...n]);
    } catch (err) {
      setCiError(err instanceof Error ? err.message : "Gagal mengirim.");
    } finally {
      setCiBusy(false);
    }
  }

  async function deleteNote(id: string) {
    setNotes((n) => n.filter((x) => x.id !== id));
    await fetch(`/api/checkin?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  if (!visible) return null;

  const isCheckin = adminAllowed && tab === "checkin";

  return (
    <>
      {/* Floating button — SATU bubble untuk semuanya */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 flex items-center justify-center text-2xl"
          aria-label="Buka chat"
        >
          💬
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-96 h-[70vh] sm:h-[500px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-teal-600 text-white">
            <div>
              <h3 className="font-semibold text-sm">{isCheckin ? "Ngobrol Bisnis 💬" : "Bantuan Keposting"}</h3>
              <p className="text-xs opacity-80">
                {isCheckin ? "Tahap uji — khusus admin" : "Balasan biasanya cepat"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {isCheckin ? (
                <button
                  onClick={() => setShowNotes((v) => !v)}
                  className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold hover:bg-white/25"
                >
                  Catatan ({notes.length})
                </button>
              ) : null}
              <button
                onClick={() => setOpen(false)}
                className="text-white hover:opacity-80 text-2xl leading-none px-2"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
          </div>

          {/* Tab switcher — hanya untuk admin */}
          {adminAllowed && (
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
              <button
                onClick={() => setTab("checkin")}
                className={`flex-1 px-3 py-2 ${tab === "checkin" ? "bg-white text-teal-700 border-b-2 border-teal-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                Ngobrol Bisnis
              </button>
              <button
                onClick={() => setTab("support")}
                className={`flex-1 px-3 py-2 ${tab === "support" ? "bg-white text-teal-700 border-b-2 border-teal-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                Bantuan
              </button>
            </div>
          )}

          {/* Daftar catatan (tab Ngobrol Bisnis) */}
          {isCheckin && showNotes && (
            <div className="max-h-32 overflow-y-auto border-b border-slate-100 bg-slate-50 p-3 space-y-1.5">
              {notes.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada catatan — mulai dari cerita apa saja.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="flex items-start justify-between gap-2">
                    <p className="text-xs text-slate-600">• {n.note}</p>
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="shrink-0 text-[10px] font-medium text-red-500 hover:underline"
                    >
                      hapus
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {(isCheckin ? ciTurns : messages).map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-teal-600 text-white rounded-br-sm"
                      : msg.failed
                        ? "bg-amber-50 border border-amber-200 text-amber-900 rounded-bl-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {(isCheckin ? ciBusy : loading) && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-slate-500">
                  Mengetik...
                </div>
              </div>
            )}
            {isCheckin && ciError ? <p className="text-xs text-red-600">{ciError}</p> : null}
          </div>

          {/* Escalate — hanya tab Bantuan */}
          {!isCheckin && !escalated && messages.some((m) => m.role === "user") && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <button
                onClick={escalate}
                disabled={escalating}
                className="w-full text-xs text-teal-700 hover:text-teal-800 font-medium disabled:opacity-50"
              >
                {escalating ? "Mengirim..." : "Butuh bantuan manusia? Kirim ke admin →"}
              </button>
            </div>
          )}

          {/* Input */}
          {isCheckin ? (
            <form onSubmit={sendCheckin} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                value={ciInput}
                onChange={(e) => setCiInput(e.target.value)}
                placeholder="Tulis cerita atau kabar bisnismu..."
                disabled={ciBusy}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={ciBusy || !ciInput.trim()}
                className="rounded-xl bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
              >
                Kirim
              </button>
            </form>
          ) : (
            <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={escalated ? "Percakapan sudah dieskalasi" : "Ketik pertanyaan..."}
                disabled={loading || escalated}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-teal-500 disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || escalated}
                className="rounded-xl bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
              >
                Kirim
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

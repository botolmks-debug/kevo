"use client";

import { useState, useEffect, useRef, FormEvent } from "react";

type Message = { role: "user" | "assistant"; content: string; failed?: boolean };

export default function SupportWidget() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });
  const [escalating, setEscalating] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cek auth via endpoint ringan — widget hanya muncul kalau user login
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

  // Auto scroll ke bawah tiap ada pesan baru
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Salam pembuka saat pertama kali dibuka
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hai! Saya asisten Keposting. Ada yang bisa saya bantu? Bisa tanya soal fitur, token, atau troubleshooting.",
        },
      ]);
    }
  }, [open, messages.length]);

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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: json.reply, failed: json.failed },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Gagal menghubungi server. Coba lagi.",
          failed: true,
        },
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
        body: JSON.stringify({
          sessionId,
          message: lastUserMsg.content,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setEscalated(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              json.note ?? "Terkirim ke admin! Kami akan balas via email dalam 24 jam.",
          },
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

  if (!visible) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 flex items-center justify-center text-2xl"
          aria-label="Buka support chat"
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
              <h3 className="font-semibold text-sm">Bantuan Keposting</h3>
              <p className="text-xs opacity-80">Balasan biasanya cepat</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white hover:opacity-80 text-2xl leading-none px-2"
              aria-label="Tutup"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
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
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-slate-500">
                  Mengetik...
                </div>
              </div>
            )}
          </div>

          {/* Escalate button */}
          {!escalated && messages.some((m) => m.role === "user") && (
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
          <form
            onSubmit={sendMessage}
            className="p-3 border-t border-slate-200 bg-white flex gap-2"
          >
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
        </div>
      )}
    </>
  );
}

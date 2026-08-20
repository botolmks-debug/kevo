"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { momenForDate, type MomenInfo } from "@/lib/ai/momenKalender";
import AutoPostControl from "@/components/content/AutoPostControl";

type Item = {
  id: string;
  jenis: string;
  imageUrl: string;
  onImageText: string;
  caption: string;
  scheduledDate?: string | null;
  scheduled_time?: string | null;
  auto_post?: boolean;
  ig_posted_at?: string | null;
  ig_post_error?: string | null;
};

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Momen untuk string tanggal YYYY-MM-DD (sumber data: lib/ai/momenKalender). */
function momenForYmd(dateStr: string): MomenInfo | null {
  const [y, m, d] = dateStr.split("-").map(Number);
  return momenForDate(new Date(y, m - 1, d));
}

export default function JadwalPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [igConnected, setIgConnected] = useState(false);

  useEffect(() => {
    // Fetch konten
    fetch("/api/generate-auto")
      .then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));

    // Fetch status IG
    fetch("/api/instagram/status")
      .then((r) => r.json())
      .then((d) => setIgConnected(d?.connected ?? false))
      .catch(() => {});
  }, []);

  const today = ymd(new Date());

  // Kelompokkan konten per tanggal jadwal.
  const byDate = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const it of items) {
      if (it.scheduledDate) (map[it.scheduledDate] ??= []).push(it);
    }
    return map;
  }, [items]);

  const unscheduled = useMemo(() => items.filter((i) => !i.scheduledDate), [items]);

  // Susun sel kalender untuk bulan yang ditampilkan (Senin di depan)
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Senin = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < startWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(ymd(new Date(year, month, d)));
    return out;
  }, [year, month]);

  async function setSchedule(id: string, date: string | null) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: date }),
      });
      if (!res.ok) throw new Error();
      setItems((cur) => cur.map((i) => (i.id === id ? { ...i, scheduledDate: date } : i)));
    } catch {
      // diamkan; user bisa coba lagi
    } finally {
      setBusyId(null);
    }
  }

  const selectedItems = selectedDate ? byDate[selectedDate] ?? [] : [];
  const selectedMomen = selectedDate ? momenForYmd(selectedDate) : null;

  function fmtLong(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${d} ${BULAN[m - 1]} ${y}`;
  }

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-navy">Jadwal Postingan</h1>
          <p className="mt-1 text-navy/60">Lihat & atur konten yang mau diposting per tanggal.</p>
        </div>

        {/* Navigasi bulan */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="rounded-full border border-line px-3 py-1 text-sm text-navy hover:bg-navy/5">‹</button>
            <h2 className="text-lg font-semibold text-navy">{BULAN[month]} {year}</h2>
            <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="rounded-full border border-line px-3 py-1 text-sm text-navy hover:bg-navy/5">›</button>
          </div>

          {/* Header hari */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-navy/50">
            {HARI.map((h) => <div key={h}>{h}</div>)}
          </div>

          {/* Grid tanggal */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, idx) => {
              if (!date) return <div key={`b${idx}`} />;
              const dayNum = Number(date.split("-")[2]);
              const list = byDate[date] ?? [];
              const momen = momenForYmd(date);
              const isToday = date === today;
              const isSelected = date === selectedDate;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  title={momen ? `${momen.emoji} ${momen.label}` : undefined}
                  className={`flex min-h-[64px] flex-col rounded-xl border p-1 text-left transition ${
                    isSelected ? "border-primary ring-2 ring-primary/20"
                    : isToday ? "border-amber-300 bg-amber-50"
                    : momen ? "border-primary/30 bg-primary/[0.04] hover:border-primary/50"
                    : "border-line hover:border-primary/40"
                  }`}
                >
                  <span className={`text-xs font-semibold ${isToday ? "text-amber-700" : "text-navy/70"}`}>{dayNum}</span>
                  {momen ? (
                    <span className="mt-0.5 truncate text-[9px] font-medium leading-tight text-primary">
                      {momen.emoji} {momen.label}
                    </span>
                  ) : null}
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {list.slice(0, 3).map((it) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={it.id} src={it.imageUrl} alt="" className="h-5 w-5 rounded object-cover" />
                    ))}
                    {list.length > 3 ? (
                      <span className="text-[10px] font-medium text-navy/50">+{list.length - 3}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Detail tanggal terpilih */}
        {selectedDate ? (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy">
                {fmtLong(selectedDate)}
                {selectedDate === today ? <span className="ml-2 text-xs font-medium text-amber-700">Hari ini</span> : null}
              </h3>
              <button type="button" onClick={() => setSelectedDate(null)} className="text-xs text-navy/50 hover:text-navy">Tutup</button>
            </div>

            {/* Info momen di tanggal ini + saran angle konten */}
            {selectedMomen ? (
              <div className="rounded-xl bg-primary/10 px-4 py-3">
                <p className="text-sm font-semibold text-primary">
                  {selectedMomen.emoji} {selectedMomen.label}
                </p>
                <p className="mt-0.5 text-xs text-navy/70">
                  Ide angle konten: {selectedMomen.angle}.
                </p>
              </div>
            ) : null}

            {selectedItems.length === 0 ? (
              <p className="text-sm text-navy/50">Belum ada konten dijadwalkan di tanggal ini.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedItems.map((it) => (
                  <div key={it.id} className="flex flex-col rounded-xl border border-line p-2 gap-2">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <p className="line-clamp-2 flex-1 text-xs text-navy/70">{it.onImageText || it.caption || "Konten"}</p>
                      <Link href="/konten" className="text-xs font-medium text-primary hover:underline">Edit</Link>
                      <button type="button" disabled={busyId === it.id} onClick={() => setSchedule(it.id, null)}
                        className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50">
                        {busyId === it.id ? "..." : "Batal"}
                      </button>
                    </div>
                    {/* Kontrol auto-post Instagram */}
                    <AutoPostControl
                      contentId={it.id}
                      scheduledTime={it.scheduled_time ?? null}
                      autoPost={it.auto_post ?? false}
                      postedAt={it.ig_posted_at ?? null}
                      postError={it.ig_post_error ?? null}
                      igConnected={igConnected}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {/* Belum terjadwal — atur cepat */}
        <Card className="flex flex-col gap-3">
          <h3 className="font-semibold text-navy">Belum terjadwal ({unscheduled.length})</h3>
          {loading ? (
            <p className="text-sm text-navy/60">Memuat...</p>
          ) : unscheduled.length === 0 ? (
            <p className="text-sm text-navy/50">Semua konten sudah punya jadwal.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {unscheduled.map((it) => (
                <div key={it.id} className="flex flex-col rounded-xl border border-line p-2 gap-2">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <p className="line-clamp-2 flex-1 text-xs text-navy/70">{it.onImageText || it.caption || "Konten"}</p>
                    <input
                      type="date"
                      disabled={busyId === it.id}
                      onChange={(e) => e.target.value && setSchedule(it.id, e.target.value)}
                      className="rounded-lg border border-line px-2 py-1 text-xs focus:border-primary focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}

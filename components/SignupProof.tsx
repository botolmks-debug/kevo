"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Panel bukti sosial di halaman /signup.
 * 4 SLOT gambar yang berputar dari kumpulan POOL (mis. 10 gambar).
 * - Tiap slot berganti gambar dengan animasi fade in/out.
 * - TIDAK ada gambar kembar tampil bersamaan (4 slot selalu beda).
 * - Urutan mengikuti daftar POOL (maju berurutan, bukan acak).
 *
 * Cara pakai: taruh gambar di public/showcase/, daftarkan nama filenya di
 * POOL di bawah. Boleh berapa saja (>4). Hanya hasil TERBAIK — ini etalase.
 */

// Kumpulan gambar etalase. Taruh file di public/showcase/, tulis di sini.
const POOL = [
  "/showcase/1.png",
  "/showcase/2.png",
  "/showcase/3.png",
  "/showcase/4.png",
  "/showcase/5.png",
  "/showcase/6.png",
  "/showcase/7.png",
  "/showcase/8.png",
  "/showcase/9.png",
  "/showcase/10.png",
];

const SLOTS = 4; // jumlah gambar tampil sekaligus (grid 2x2)
const INTERVAL_MS = 3500; // jeda antar pergantian slot
const FADE_MS = 650; // durasi fade

export function SignupProof() {
  const pool = POOL.slice(0, Math.max(POOL.length, 0));
  const enough = pool.length > SLOTS;

  // indeks gambar yang sedang tampil di tiap slot (awal: 0,1,2,3)
  const [slots, setSlots] = useState<number[]>(() =>
    Array.from({ length: SLOTS }, (_, i) => i % Math.max(pool.length, 1))
  );
  // penanda slot mana yang sedang fade (untuk animasi)
  const [fading, setFading] = useState<number>(-1);
  // penunjuk gambar berikutnya di POOL yang akan dimasukkan
  const [nextPtr, setNextPtr] = useState<number>(SLOTS % Math.max(pool.length, 1));
  // slot mana yang giliran diganti berikutnya (round-robin)
  const [slotPtr, setSlotPtr] = useState<number>(0);

  // CATATAN: sebelumnya di sini ada preload PAKSA seluruh 10 gambar POOL
  // (±8MB PNG mentah) langsung saat halaman /signup dibuka, padahal cuma 4
  // yang tampil sekaligus — itu penyebab halaman signup berat di-load.
  // next/image di bawah sudah otomatis convert ke WebP/AVIF + resize sesuai
  // ukuran slot (jauh lebih kecil dari PNG asli) dan browser meng-cache
  // tiap URL setelah pertama kali tampil, jadi preload manual tidak perlu lagi.

  useEffect(() => {
    if (!enough) return; // kalau gambar <= 4, tidak perlu berputar

    const tick = setInterval(() => {
      const targetSlot = slotPtr;

      // cari gambar berikutnya dari POOL yang TIDAK sedang tampil di slot lain
      let candidate = nextPtr;
      let guard = 0;
      const shown = new Set(slots.filter((_, i) => i !== targetSlot).map((v) => v));
      while (shown.has(candidate) && guard < pool.length) {
        candidate = (candidate + 1) % pool.length;
        guard++;
      }

      // mulai fade pada slot target
      setFading(targetSlot);

      // setelah fade-out, ganti gambar lalu fade-in
      setTimeout(() => {
        setSlots((prev) => {
          const copy = [...prev];
          copy[targetSlot] = candidate;
          return copy;
        });
        setFading(-1);
      }, FADE_MS);

      setNextPtr((candidate + 1) % pool.length);
      setSlotPtr((p) => (p + 1) % SLOTS);
    }, INTERVAL_MS);

    return () => clearInterval(tick);
  }, [enough, slotPtr, nextPtr, slots, pool.length]);

  const visible = pool.length >= SLOTS ? slots : pool.map((_, i) => i);

  return (
    <div className="flex flex-col justify-center">
      <div className="mb-1 inline-flex items-center gap-2 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        ✨ Hasil nyata pengguna
      </div>
      <h2 className="text-2xl font-bold leading-tight text-navy sm:text-3xl">
        Ini yang kamu dapat.
        <br />
        Bukan mockup, hasil asli.
      </h2>
      <p className="mt-2 max-w-md text-sm text-navy/60">
        Cukup upload 1 foto produk — jadi konten siap posting dalam hitungan detik.
      </p>

      <div className="mt-5 grid grid-cols-4 gap-2.5">
        {visible.map((imgIdx, slotIdx) => (
          <div
            key={slotIdx}
            className="relative aspect-[9/16] w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5"
          >
            <Image
              src={pool[imgIdx]}
              alt={`Contoh hasil ${slotIdx + 1}`}
              fill
              sizes="(max-width: 640px) 22vw, 160px"
              loading={slotIdx < 4 ? "eager" : "lazy"}
              className="object-cover transition-opacity"
              style={{
                opacity: fading === slotIdx ? 0 : 1,
                transitionDuration: `${FADE_MS}ms`,
              }}
            />
          </div>
        ))}
      </div>

      <Link
        href="/coba"
        className="mt-5 inline-flex items-center gap-1 self-start text-sm font-semibold text-primary hover:underline"
      >
        Coba dulu dengan fotomu sendiri, gratis →
      </Link>
    </div>
  );
}

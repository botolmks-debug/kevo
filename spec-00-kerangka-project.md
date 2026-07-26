# Spec Irisan 00 — Kerangka Project (Scaffolding)

Kerjakan ini **sebelum** spec-01. Serahkan ke Claude Code. Patuhi `CLAUDE.md`.

---

## Tujuan

Bangun **fondasi project dari awal** — kosong tapi rapi dan jalan — siap diisi
fitur. Belum ada fitur apa pun; yang penting struktur benar, tooling jalan, dan
`dev`/`test`/`lint` semua lewat.

---

## Scope

**Termasuk:**
- Project **Next.js (App Router) + TypeScript** baru.
- **Tailwind CSS** (UI akan visual, siapkan dari awal).
- **Supabase client** terpasang & terkoneksi (server + browser), diambil dari
  env — tapi **belum ada tabel/skema** apa pun.
- Setup **testing** (Vitest) + satu test trivial yang lulus, untuk membuktikan
  harness jalan.
- Setup **ESLint** (lint bersih).
- **Struktur folder** yang rapi, sesuai kebutuhan irisan berikutnya.
- `.env.example` (daftar variabel, **tanpa nilai asli**) + `.gitignore` yang
  menutup `.env*`.
- `README.md` singkat berisi cara menjalankan.
- Route `/api/health` yang mengembalikan status ok dan menandai apakah env
  Supabase sudah terisi — **tanpa mencetak nilai key-nya**.

**TIDAK termasuk (irisan berikutnya):**
- Mesin render template (itu spec-01)
- Auth / login
- Tabel database / skema
- Fitur konten, caption, editor

---

## Struktur Folder Target

```
app/
  layout.tsx
  page.tsx                 # halaman kosong sederhana ("app siap")
  api/health/route.ts      # health check
lib/
  supabase/
    client.ts              # client untuk browser
    server.ts              # client untuk server
  templates/               # (kosong, diisi di spec-01)
  render/                  # (kosong, diisi di spec-01)
public/
  fonts/                   # (kosong, diisi di spec-01)
__tests__/
  smoke.test.ts            # test trivial yang lulus
.env.example
.gitignore
README.md
```

---

## Detail

### Supabase client
- `lib/supabase/client.ts` dan `lib/supabase/server.ts` menginisialisasi client
  dari env. Belum menyentuh tabel apa pun.
- Variabel env yang dibutuhkan (taruh di `.env.example`, **tanpa nilai**):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - (server, kalau perlu nanti) `SUPABASE_SERVICE_ROLE_KEY`

### /api/health
- Kembalikan JSON mis. `{ ok: true, env: { supabaseUrl: true, supabaseAnonKey: false } }`
  — nilai boolean **ada/tidaknya** env, **bukan isinya**. Jangan pernah cetak
  nilai key.

### Testing
- Vitest terpasang, `npm test` jalan.
- `__tests__/smoke.test.ts`: satu test bermakna sederhana (mis. cek fungsi util
  kecil), untuk memastikan harness benar — bukan test kosong.

### Keamanan
- Pastikan `.gitignore` menutup `.env`, `.env.local`, `.env*.local`.
- Jangan commit nilai env apa pun. `.env.example` hanya berisi nama variabel.

---

## Yang Disiapkan Pemilik (bukan agen)

Agen **tidak** membuat akun atau mengisi kredensial. Saat sampai ke bagian
Supabase, agen cukup **mendaftarkan env apa saja yang dibutuhkan**, lalu pemilik
yang:
1. Membuat project Supabase (dev).
2. Menyalin URL + anon key ke `.env.local` sendiri.

Agen lanjut hanya setelah pemilik konfirmasi env sudah diisi.

---

## Kriteria Terima (Acceptance)

- `npm install` sukses.
- `npm run dev` → app menyala, halaman home tampil ("app siap").
- `npm test` → lulus (test trivial).
- `npm run lint` → bersih.
- `/api/health` → mengembalikan status ok + flag ada/tidaknya env (tanpa nilai key).
- `.env*` ter-gitignore; `.env.example` ada tanpa nilai asli.
- Struktur folder sesuai target di atas (folder `templates/`, `render/`, `fonts/`
  boleh kosong dulu).

---

## Smoke Test Manual (untuk pemilik)

1. `npm install && npm run dev` → buka halaman, pastikan menyala.
2. Buka `/api/health` → cek JSON statusnya.
3. `npm test` dan `npm run lint` → pastikan keduanya lewat.

Setelah semua hijau → lanjut ke **spec-01 (mesin render template)**.

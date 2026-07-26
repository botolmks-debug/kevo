# Kevo

Aplikasi generate konten sosial media dari template brand tetap (teks + gambar
→ konten jadi + caption otomatis). Dibangun per irisan vertikal — lihat
`spec-00-kerangka-project.md`, `spec-01-mesin-render-template.md`, dan
`CLAUDE.md` untuk konteks kerja.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # buka http://localhost:3000
```

## Perintah

```bash
npm run dev      # jalankan lokal
npm test         # jalankan test (Vitest)
npm run lint     # cek lint (ESLint)
npm run build    # build production
```

## Cek kesehatan

Buka `http://localhost:3000/api/health` — mengembalikan status ok dan flag
ada/tidaknya env Supabase (bukan nilainya):

```json
{ "ok": true, "env": { "supabaseUrl": true, "supabaseAnonKey": false } }
```

## Struktur

```
app/               # routes (App Router)
  api/health/       # health check
lib/
  supabase/         # client Supabase (browser + server)
  templates/        # definisi template (diisi di spec-01)
  render/           # mesin render (diisi di spec-01)
public/fonts/       # font untuk render Satori (diisi di spec-01)
__tests__/          # test
```

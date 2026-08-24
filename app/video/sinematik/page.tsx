"use client";

// /video/sinematik — Video Sinematik Produk (8 detik) + VO Narator. ADMIN-ONLY (testing).
// Alur: pilih 1-3 foto produk -> storyboard -> keyframe (approve/ulang murah) ->
// generate video (Veo ref-to-video via fal) -> TTS narator -> ffmpeg.wasm tempel VO -> player + unduh.

import { useEffect, useRef, useState } from "react";

type Scene = { detik: string; deskripsi: string; imagePrompt: string };
type Storyboard = { judul: string; naskahVO: string; videoPrompt: string; scenes: Scene[] };
type Foto = { id: string; url: string; nama: string };

const VIDEO_DUR = 8; // detik (batas Veo)
const VO_MAX = 7.9; // audio harus selesai sebelum ini
const ATEMPO_MAX = 1.15; // batas percepatan natural

export default function SinematikPage() {
  // Galeri
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [pilih, setPilih] = useState<string[]>([]);
  const [gender, setGender] = useState<"pria" | "wanita">("pria");
  const [produkNama, setProdukNama] = useState("");
  const [produkDeskripsi, setProdukDeskripsi] = useState("");

  // Storyboard
  const [sb, setSb] = useState<Storyboard | null>(null);
  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);

  // Keyframe PER PANEL adegan (null = belum dibuat). Panel 1 jadi acuan panel lain.
  const [keyframes, setKeyframes] = useState<(string | null)[]>([]);
  const [kfBusy, setKfBusy] = useState<number | null>(null); // index panel yg sedang dibuat

  // Video
  const [requestId, setRequestId] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);

  // UI
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    loadFotos();
    return () => pollRef.current && clearInterval(pollRef.current);
  }, []);

  async function loadFotos() {
    try {
      const r = await fetch("/api/images");
      const d = await r.json();
      const items: any[] = d.images || d.items || d.data || (Array.isArray(d) ? d : []);
      const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "") + "/storage/v1/object/public/user-images/";
      const mapped: Foto[] = items
        .map((it) => ({
          id: it.id,
          url: it.url || it.publicUrl || it.imageUrl || (it.storage_path ? base + it.storage_path : ""),
          nama: it.title || it.name || it.label || it.category || "Foto",
        }))
        .filter((f) => f.id && f.url);
      setFotos(mapped);
    } catch {
      setErr("Gagal memuat galeri foto");
    }
  }

  function togglePilih(id: string) {
    setPilih((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p));
  }

  // ---------- Langkah 1: Storyboard ----------
  async function buatStoryboard() {
    setErr(null);
    setSb(null);
    setKeyframes([]);
    setFinalUrl(null);
    setBusy("Membuat storyboard...");
    try {
      const r = await fetch("/api/video/sinematik/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: pilih, produkNama, produkDeskripsi }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSb(d.storyboard);
      setProductImageUrls(d.productImageUrls || []);
      setKeyframes(new Array((d.storyboard?.scenes || []).length).fill(null));
    } catch (e: any) {
      setErr(e.message || "Gagal membuat storyboard");
    } finally {
      setBusy(null);
    }
  }

  // ---------- Langkah 2: Gambar storyboard PER PANEL (murah, boleh diulang) ----------
  // Buat satu keyframe. refDataUri = panel acuan (panel 1) utk jaga konsistensi.
  async function fetchKeyframe(imagePrompt: string, refDataUri?: string): Promise<string> {
    const r = await fetch("/api/video/sinematik/keyframe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePrompt, productImageUrls, refImageDataUri: refDataUri }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d.dataUri as string;
  }

  // Buat SEMUA panel berurutan: panel 0 dulu → jadi acuan panel berikutnya.
  async function buatSemuaKeyframe() {
    if (!sb) return;
    setErr(null);
    try {
      const hasil: (string | null)[] = new Array(sb.scenes.length).fill(null);
      let acuan: string | undefined;
      for (let i = 0; i < sb.scenes.length; i++) {
        setKfBusy(i);
        setBusy(`Membuat gambar panel ${i + 1} dari ${sb.scenes.length}...`);
        const uri = await fetchKeyframe(sb.scenes[i].imagePrompt, acuan);
        hasil[i] = uri;
        if (i === 0) acuan = uri; // panel 1 jadi acuan konsistensi
        setKeyframes([...hasil]);
      }
    } catch (e: any) {
      setErr(e.message || "Gagal membuat gambar panel");
    } finally {
      setKfBusy(null);
      setBusy(null);
    }
  }

  // Ulangi satu panel saja.
  async function ulangiKeyframe(i: number) {
    if (!sb) return;
    setErr(null);
    setKfBusy(i);
    setBusy(`Mengulang gambar panel ${i + 1}...`);
    try {
      const acuan = i > 0 ? keyframes[0] || undefined : undefined;
      const uri = await fetchKeyframe(sb.scenes[i].imagePrompt, acuan);
      setKeyframes((prev) => {
        const next = [...prev];
        next[i] = uri;
        return next;
      });
    } catch (e: any) {
      setErr(e.message || "Gagal mengulang panel");
    } finally {
      setKfBusy(null);
      setBusy(null);
    }
  }

  const semuaPanelSiap = sb ? keyframes.length === sb.scenes.length && keyframes.every(Boolean) : false;

  // ---------- Langkah 3: Generate video + poll ----------
  async function generateVideo() {
    if (!sb) return;
    setErr(null);
    setFinalUrl(null);
    setBusy("Mengirim job video (Veo)...");
    try {
      const r = await fetch("/api/video/sinematik/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoPrompt: sb.videoPrompt,
          keyframeDataUris: keyframes.filter(Boolean),
          productImageUrls,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setRequestId(d.requestId);
      setBusy("Video sedang dibuat (±1-3 menit)...");
      pollRef.current = setInterval(() => cekStatus(d.requestId), 10000);
    } catch (e: any) {
      setErr(e.message || "Gagal submit video");
      setBusy(null);
    }
  }

  async function cekStatus(id: string) {
    try {
      const r = await fetch(`/api/video/sinematik/status?id=${id}`);
      const d = await r.json();
      if (d.status === "COMPLETED") {
        clearInterval(pollRef.current);
        setBusy("Video jadi. Membuat voice over...");
        await tempelVO(id);
      } else if (d.status === "FAILED") {
        clearInterval(pollRef.current);
        setErr(d.error || "Video gagal dibuat");
        setBusy(null);
      }
    } catch {
      /* poll berikutnya */
    }
  }

  // ---------- Langkah 4: TTS + ukur durasi + ffmpeg tempel ----------
  async function tempelVO(id: string) {
    try {
      if (!sb) throw new Error("Storyboard hilang");

      // 1) TTS
      const tr = await fetch("/api/video/sinematik/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naskah: sb.naskahVO, gender }),
      });
      const td = await tr.json();
      if (!tr.ok) throw new Error(td.error);
      const audioBytes = Uint8Array.from(atob(td.audioBase64), (c) => c.charCodeAt(0));

      // 2) Ukur durasi audio — jaminan kata tidak terpotong
      const voDur = await ukurDurasiAudio(audioBytes);
      let atempo = 1;
      if (voDur > VO_MAX) {
        atempo = voDur / VO_MAX;
        if (atempo > ATEMPO_MAX) {
          throw new Error(
            `Naskah terlalu panjang untuk 8 detik (audio ${voDur.toFixed(1)} dtk). ` +
              `Persingkat naskah VO lalu generate ulang — audio TIDAK akan dipotong paksa.`
          );
        }
      }

      // 3) Unduh video via proxy
      setBusy("Menggabungkan video + voice over...");
      const vr = await fetch(`/api/video/sinematik/status?id=${id}&dl=1`);
      if (!vr.ok) throw new Error("Gagal mengunduh video hasil");
      const videoBytes = new Uint8Array(await vr.arrayBuffer());

      // 4) ffmpeg.wasm: buang audio bawaan (kalau ada), tempel VO (dipercepat halus bila perlu)
      const ffmpeg = await loadFFmpeg();
      await ffmpeg.writeFile("in.mp4", videoBytes);
      await ffmpeg.writeFile("vo.mp3", audioBytes);
      const args = [
        "-i", "in.mp4",
        "-i", "vo.mp3",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        ...(atempo > 1.001 ? ["-filter:a", `atempo=${atempo.toFixed(3)}`] : []),
        "-c:a", "aac",
        "-b:a", "160k",
        "out.mp4",
      ];
      await ffmpeg.exec(args);
      const out = await ffmpeg.readFile("out.mp4");
      const blob = new Blob([out as any], { type: "video/mp4" });
      setFinalUrl(URL.createObjectURL(blob));
      setBusy(null);
    } catch (e: any) {
      setErr(e.message || "Gagal menempel voice over");
      setBusy(null);
    }
  }

  // ---------- Util ----------
  function ukurDurasiAudio(bytes: Uint8Array): Promise<number> {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(new Blob([bytes as any], { type: "audio/mpeg" }));
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        res(a.duration);
      };
      a.onerror = () => {
        URL.revokeObjectURL(url);
        rej(new Error("Gagal membaca audio TTS"));
      };
      a.src = url;
    });
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Video Sinematik Produk (8 dtk) — Beta
      </h1>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
        Iklan produk gaya TV: multi-angle sinematik + voice over narator. Biaya ±Rp26rb/klip
        (Veo tanpa audio via fal). Khusus admin selama testing.
      </p>

      {err && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 14 }}>
          {err}
        </div>
      )}
      {busy && (
        <div style={{ background: "#f0fdfa", color: "#0f766e", padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 14 }}>
          ⏳ {busy}
        </div>
      )}

      {/* Card 1: pilih foto + info produk */}
      <section style={card}>
        <h2 style={h2}>1. Pilih 1-3 foto produk (angle berbeda lebih bagus)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 8 }}>
          {fotos.map((f) => (
            <button
              key={f.id}
              onClick={() => togglePilih(f.id)}
              style={{
                border: pilih.includes(f.id) ? "3px solid #0d9488" : "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 0,
                overflow: "hidden",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              <img src={f.url} alt={f.nama} style={{ width: "100%", height: 96, objectFit: "cover", display: "block" }} />
            </button>
          ))}
          {fotos.length === 0 && <p style={{ fontSize: 13, color: "#94a3b8" }}>Belum ada foto di galeri.</p>}
        </div>
        <input
          placeholder="Nama produk (opsional, mis. Botol Spray 100ml)"
          value={produkNama}
          onChange={(e) => setProdukNama(e.target.value)}
          style={input}
        />
        <textarea
          placeholder="Deskripsi singkat produk (opsional — bahan naskah narator)"
          value={produkDeskripsi}
          onChange={(e) => setProdukDeskripsi(e.target.value)}
          rows={2}
          style={{ ...input, resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 13, color: "#475569" }}>Suara narator:</span>
          {(["pria", "wanita"] as const).map((g) => (
            <button key={g} onClick={() => setGender(g)} style={g === gender ? pillOn : pillOff}>
              {g === "pria" ? "Pria" : "Wanita"}
            </button>
          ))}
        </div>
        <button onClick={buatStoryboard} disabled={pilih.length < 1 || !!busy} style={btnPrimary}>
          Buat Storyboard
        </button>
      </section>

      {/* Card 2: storyboard */}
      {sb && (
        <section style={card}>
          <h2 style={h2}>2. Storyboard — {sb.judul}</h2>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 10 }}>
            <tbody>
              {sb.scenes.map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 600, whiteSpace: "nowrap", color: "#0d9488" }}>
                    {s.detik} dtk
                  </td>
                  <td style={{ padding: "6px 8px" }}>{s.deskripsi}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Naskah voice over (boleh edit, jaga ≤21 kata):</label>
          <textarea
            value={sb.naskahVO}
            onChange={(e) => setSb({ ...sb, naskahVO: e.target.value })}
            rows={3}
            style={{ ...input, resize: "vertical" }}
          />
          <p style={{ fontSize: 12, color: "#94a3b8" }}>
            {sb.naskahVO.trim().split(/\s+/).filter(Boolean).length} kata — target 18-21 kata untuk 8 detik.
          </p>
          <button onClick={buatSemuaKeyframe} disabled={!!busy} style={btnPrimary}>
            {keyframes.some(Boolean) ? "Buat Ulang Semua Panel" : "Buat Gambar Storyboard (semua panel)"}
          </button>
        </section>
      )}

      {/* Card 3: panel storyboard berjejer (gambar + naskah + deskripsi per adegan) */}
      {sb && keyframes.some(Boolean) && (
        <section style={card}>
          <h2 style={h2}>3. Panel storyboard — cek tiap adegan (label & karakter harus konsisten)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sb.scenes.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
                <div style={{ width: 120, flexShrink: 0 }}>
                  {keyframes[i] ? (
                    <img src={keyframes[i] as string} alt={`panel ${i + 1}`} style={{ width: 120, borderRadius: 10, display: "block" }} />
                  ) : (
                    <div style={{ width: 120, height: 213, borderRadius: 10, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#94a3b8" }}>
                      {kfBusy === i ? "..." : "kosong"}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <p style={{ fontWeight: 700, color: "#0d9488", margin: 0 }}>{s.detik} dtk</p>
                  <p style={{ margin: "4px 0", color: "#334155" }}>{s.deskripsi}</p>
                  <button onClick={() => ulangiKeyframe(i)} disabled={!!busy}
                    style={{ ...pillOff, marginTop: 4 }}>
                    {kfBusy === i ? "Membuat..." : "Ulangi panel ini"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            Panel 1 jadi acuan konsistensi untuk panel lain. Kalau ada yang meleset, klik "Ulangi panel ini" (murah).
            Video final = 1 klip; semua panel + foto produk jadi referensi untuk Veo.
          </p>
          <button onClick={generateVideo} disabled={!!busy || !semuaPanelSiap} style={btnPrimary}>
            {semuaPanelSiap ? "Generate Video (±Rp26rb)" : "Lengkapi semua panel dulu ↑"}
          </button>
        </section>
      )}

      {/* Card 4: hasil */}
      {finalUrl && (
        <section style={card}>
          <h2 style={h2}>4. Hasil — video + voice over</h2>
          <video src={finalUrl} controls playsInline style={{ width: 270, borderRadius: 14, display: "block", marginBottom: 10 }} />
          <a href={finalUrl} download="keposting-sinematik.mp4" style={{ ...btnPrimary, display: "inline-block", textDecoration: "none", textAlign: "center" }}>
            Unduh MP4
          </a>
        </section>
      )}
    </main>
  );
}

// ---------- ffmpeg.wasm loader (pola blob URL — aman lintas-origin) ----------
let _ffmpeg: any = null;
async function loadFFmpeg(): Promise<any> {
  if (_ffmpeg) return _ffmpeg;
  const dynImport = (u: string) => new Function("u", "return import(u)")(u);
  const FF = "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm";
  const CORE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

  async function toBlobURL(url: string, type: string): Promise<string> {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Gagal memuat ffmpeg: ${url}`);
    return URL.createObjectURL(new Blob([await r.arrayBuffer()], { type }));
  }

  // Modul utama dimuat via blob juga supaya worker-nya tidak kena cross-origin
  const indexSrc = await (await fetch(`${FF}/index.js`)).text();
  const indexBlob = URL.createObjectURL(new Blob([indexSrc], { type: "text/javascript" }));
  const mod = await dynImport(indexBlob);
  const ffmpeg = new mod.FFmpeg();

  const [coreURL, wasmURL, classWorkerURL] = await Promise.all([
    toBlobURL(`${CORE}/ffmpeg-core.js`, "text/javascript"),
    toBlobURL(`${CORE}/ffmpeg-core.wasm`, "application/wasm"),
    toBlobURL(`${FF}/worker.js`, "text/javascript"),
  ]);

  await ffmpeg.load({ coreURL, wasmURL, classWorkerURL });
  _ffmpeg = ffmpeg;
  return ffmpeg;
}

// ---------- Style ----------
const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  marginBottom: 14,
};
const h2: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 10 };
const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 14,
  marginTop: 8,
};
const btnPrimary: React.CSSProperties = {
  marginTop: 12,
  background: "#0d9488",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
const pillOn: React.CSSProperties = {
  background: "#0d9488",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "4px 12px",
  fontSize: 13,
  cursor: "pointer",
};
const pillOff: React.CSSProperties = {
  background: "#f1f5f9",
  color: "#475569",
  border: "none",
  borderRadius: 999,
  padding: "4px 12px",
  fontSize: 13,
  cursor: "pointer",
};

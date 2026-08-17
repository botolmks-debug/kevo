import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { buildPolosTemplateAt } from "@/lib/templates/polos";
import { renderTemplate } from "@/lib/render/renderTemplate";
import type { AspectRatio } from "@/lib/templates/types";

/**
 * RENDER ULANG JUDUL DEMO — TANPA AI.
 * Ambil background hasil AI yang sudah tersimpan (<demoId>-bg.png),
 * tempel judul baru via renderTemplate (mesin yang sama), timpa <demoId>.png.
 * Biaya: hanya render Satori + storage overwrite — tidak ada panggilan AI,
 * jadi aman dari penyalahgunaan biaya. Batas 5x render ulang dijaga di client.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // render saja, tak perlu 300 detik

const DEMO_BUCKET = "demo-results";
const RATIO: AspectRatio = "4:5";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TITLE_MIN = 3;
const TITLE_MAX = 120;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      demoId?: string;
      title?: string;
      x?: number; // 0..1 posisi horizontal pusat judul
      y?: number; // 0..1 posisi vertikal pusat judul
    } | null;

    const demoId = String(body?.demoId || "").trim();
    const title = String(body?.title || "").trim();
    // koordinat 0..1; default tengah-bawah (0.5, 0.82) kalau tak dikirim
    const x = Number.isFinite(body?.x) ? Math.max(0, Math.min(1, body!.x as number)) : 0.5;
    const y = Number.isFinite(body?.y) ? Math.max(0, Math.min(1, body!.y as number)) : 0.82;

    // demoId WAJIB format UUID — sekaligus mencegah path traversal
    if (!UUID_RE.test(demoId)) {
      return NextResponse.json({ error: "bad_id" }, { status: 400 });
    }
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      return NextResponse.json({ error: "bad_title" }, { status: 400 });
    }

    const svc = createServiceRoleClient();

    // Ambil background hasil AI (tanpa teks)
    const dl = await svc.storage
      .from(DEMO_BUCKET)
      .download(`${demoId}-bg.png`);
    if (dl.error || !dl.data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const bgBuffer = Buffer.from(await dl.data.arrayBuffer());
    const bgDataUri = `data:image/png;base64,${bgBuffer.toString("base64")}`;

    // Render ulang dengan judul baru — mesin & template yang sama
    const pngBuffer = await renderTemplate({
      template: buildPolosTemplateAt(x, y),
      values: { photo: bgDataUri, caption: title },
      ratio: RATIO,
    });

    // Timpa hasil final (upsert) — tidak menambah file baru di storage
    const up = await svc.storage
      .from(DEMO_BUCKET)
      .upload(`${demoId}.png`, pngBuffer, {
        contentType: "image/png",
        upsert: true,
      });
    if (up.error) {
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }

    const { data: pub } = svc.storage
      .from(DEMO_BUCKET)
      .getPublicUrl(`${demoId}.png`);

    // ?v= untuk menembus cache browser/CDN (URL sama, isi berubah)
    return NextResponse.json({ imageUrl: `${pub.publicUrl}?v=${Date.now()}` });
  } catch (err) {
    console.error("[demo-render]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

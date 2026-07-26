import { NextRequest, NextResponse } from "next/server";
import { validateRenderInput } from "@/lib/templates/validateRenderInput";
import { renderTemplate } from "@/lib/render/renderTemplate";

// butuh fs + native binary resvg — tidak bisa jalan di edge runtime.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body bukan JSON yang valid" }, { status: 400 });
  }

  const validation = validateRenderInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const png = await renderTemplate(validation.value);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "gagal merender template" },
      { status: 500 },
    );
  }
}

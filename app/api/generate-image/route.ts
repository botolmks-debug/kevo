import { NextRequest, NextResponse } from "next/server";
import { editImage } from "@/lib/ai/geminiImage";
import { buildScenePrompt } from "@/lib/ai/scenePrompt";
import type { AspectRatio } from "@/lib/templates/types";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

export const runtime = "nodejs";

const VALID_RATIOS: AspectRatio[] = ["4:5", "1:1", "9:16"];

type RequestBody = { imageUrl: string; aspectRatio: AspectRatio; profile: BusinessProfile };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidBody(body: unknown): body is RequestBody {
  if (!isRecord(body)) return false;
  return (
    typeof body.imageUrl === "string" &&
    body.imageUrl.length > 0 &&
    typeof body.aspectRatio === "string" &&
    VALID_RATIOS.includes(body.aspectRatio as AspectRatio) &&
    isRecord(body.profile) &&
    isRecord(body.profile.business) &&
    isRecord(body.profile.offering) &&
    isRecord(body.profile.positioning)
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body bukan JSON yang valid" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "imageUrl, aspectRatio, dan profile wajib diisi" }, { status: 400 });
  }

  let imageBase64: string;
  let mimeType: string;
  try {
    const sourceRes = await fetch(body.imageUrl);
    if (!sourceRes.ok) {
      throw new Error(`status ${sourceRes.status}`);
    }
    mimeType = sourceRes.headers.get("content-type") ?? "image/jpeg";
    const arrayBuffer = await sourceRes.arrayBuffer();
    imageBase64 = Buffer.from(arrayBuffer).toString("base64");
  } catch {
    return NextResponse.json({ error: "Gagal mengambil gambar sumber." }, { status: 502 });
  }

  const prompt = buildScenePrompt(body.profile);
  const result = await editImage({ imageBase64, mimeType, aspectRatio: body.aspectRatio, prompt });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ dataUri: result.dataUri });
}

import { NextRequest, NextResponse } from "next/server";
import { buildCaptionPrompt } from "@/lib/ai/captionPrompt";
import { generateCaption } from "@/lib/ai/gemini";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

export const runtime = "nodejs";

type RequestBody = {
  profile: BusinessProfile;
  templateName: string;
  values: Record<string, string>;
};

function isValidBody(body: unknown): body is RequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.templateName === "string" &&
    b.templateName.trim().length > 0 &&
    typeof b.values === "object" &&
    b.values !== null &&
    typeof b.profile === "object" &&
    b.profile !== null
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
    return NextResponse.json(
      { error: "profil bisnis, templateName, dan values wajib diisi" },
      { status: 400 },
    );
  }

  const prompt = buildCaptionPrompt(body.profile, {
    templateName: body.templateName,
    values: body.values,
  });

  const result = await generateCaption(prompt);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ caption: result.text }, { status: 200 });
}

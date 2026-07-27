import type { BusinessProfile } from "@/lib/onboarding/businessProfile";

/**
 * Prompt untuk Bagian B (susun ulang latar/scene) — spec-perbaikan-render-generate.md.
 * Default: objek utama dipertahankan apa adanya, AI cuma menggenerate latar
 * di sekelilingnya, disesuaikan dengan target market bisnis (bukan dipatok
 * satu jenis latar tetap).
 */
export function buildScenePrompt(profile: BusinessProfile): string {
  return `Keep the main product/object in this photo exactly as it is: do not redraw, restyle, distort, or change its appearance, proportions, labels, colors, or branding. Only replace the background/scene behind and around it.

Business context (use this to decide a fitting environment — do not default to a generic cafe unless it genuinely fits):
- Industry: ${profile.business.industry || "-"}
- What makes this business different: ${profile.positioning.differentiator || "-"}
- Target customers: ${profile.offering.targetCustomer || "-"}

Generate a realistic, appealing environment/scene that would resonate with these target customers. Match lighting, shadows, scale, and perspective naturally so the original object looks like it genuinely belongs in the new scene — avoid a "pasted on" look. Do not add extra people, text, watermarks, or logos.`;
}

import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/lib/render/renderTemplate";
import { pengumumanTemplate } from "@/lib/templates/pengumuman";
import { SOCIAL_PLATFORMS } from "@/lib/social/platforms";

function isPng(buffer: Buffer): boolean {
  return buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
}

// Ikon SocialIcon dibangun dari elemen SVG mentah (rect/circle/path/dst).
// Satori tidak mendukung <text> di dalam <svg> ("convert them to <path>"),
// jadi tiap platform (+ id tak dikenal untuk fallback) wajib benar-benar
// dirender lewat satori di sini, bukan cuma dicek bentuk elemen React-nya.
const platformIds = [...SOCIAL_PLATFORMS.map((p) => p.id), "some-future-platform"];

describe("ikon sosial media benar-benar bisa dirender satori (bukan cuma bentuk elemen)", () => {
  it.each(platformIds)("footer dengan platform '%s' render jadi PNG tanpa error", async (platformId) => {
    const template = {
      ...pengumumanTemplate,
      brand: {
        ...pengumumanTemplate.brand,
        footer: { text: "Demo", socials: [{ platformId, value: "@demo" }] },
      },
    };

    const png = await renderTemplate({ template, values: { headline: "Judul", body: "Isi" }, ratio: "4:5" });

    expect(isPng(png)).toBe(true);
  }, 20000);
});

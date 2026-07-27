import { describe, expect, it } from "vitest";
import { templates } from "@/lib/templates";
import type { Template } from "@/lib/templates/types";

function logoSignature(t: Template): string {
  const logo = t.layouts["4:5"].logo;
  return `${logo.x},${logo.y},${logo.size}`;
}

function footerSignature(t: Template): string {
  const f = t.layouts["4:5"].footerLayout;
  return `${f.x},${f.y},${f.direction}`;
}

describe("keragaman desain antar template (anti-seragam)", () => {
  it("posisi logo tidak sama di semua template (bukan 1 desain digeser)", () => {
    const signatures = new Set(templates.map(logoSignature));

    expect(signatures.size).toBe(templates.length);
  });

  it("tata letak footer sosial media tidak sama di semua template", () => {
    const signatures = new Set(templates.map(footerSignature));

    expect(signatures.size).toBe(templates.length);
  });

  it("arah susunan footer (row/column) bervariasi, bukan satu arah untuk semua", () => {
    const directions = new Set(templates.map((t) => t.layouts["4:5"].footerLayout.direction));

    expect(directions.size).toBeGreaterThan(1);
  });

  it("ada template berpola dan ada template polos (tanpa dekorasi) sekaligus", () => {
    const withPattern = templates.filter((t) => (t.layouts["4:5"].decorations?.length ?? 0) > 0);
    const plain = templates.filter((t) => (t.layouts["4:5"].decorations?.length ?? 0) === 0);

    expect(plain.length).toBeGreaterThanOrEqual(2);
    expect(plain.length).toBeLessThanOrEqual(5);
    expect(withPattern.length).toBeGreaterThanOrEqual(2);
  });
});

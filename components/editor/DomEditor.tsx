"use client";

import { useRef, useState } from "react";
import type { TemplateLayout, TextSlot } from "@/lib/templates/types";
import type { EditorOverrides } from "@/lib/editor/layoutOverrides";
import { fitFontSize } from "@/lib/render/fitText";
import { FONT_OPTIONS } from "@/lib/templates/fonts";

/**
 * DomEditor — EDITOR SATU-MESIN (uji coba, admin saja).
 * ---------------------------------------------------------------
 * Menggambar slot teks + logo sebagai ELEMEN HTML biasa (bukan Konva).
 * Saat Simpan, konten/page memotret elemen ini via html-to-image → PNG.
 * Karena yang diedit = yang dipotret, hasil MUSTAHIL beda dari preview.
 *
 * `layout` yang diterima SUDAH memuat override (dari applyEditorOverrides),
 * jadi slot di sini = kondisi terkini. Menggeser/mengatur menulis balik ke
 * `overrides` supaya konsisten dengan sistem simpan yang ada.
 *
 * Cakupan uji tahap ini: foto + teks + logo. Footer/sosmed/badge menyusul.
 * ---------------------------------------------------------------
 */

const DISPLAY_W = 340;

type Props = {
  layout: TemplateLayout;
  values: Record<string, string>;
  overrides: EditorOverrides;
  onOverridesChange: (o: EditorOverrides) => void;
  onTextChange?: (slotId: string, value: string) => void;
  photo: string | null;
  logoUrl?: string | null;
  /** Ref ke kanvas ukuran-tampilan — dipotret html-to-image (pakai pixelRatio). */
  exportRef: React.RefObject<HTMLDivElement | null>;
};

function textSlots(layout: TemplateLayout): TextSlot[] {
  return layout.slots.filter((s): s is TextSlot => s.type === "text");
}

function buildTextShadow(slot: TextSlot, scale: number): string | undefined {
  const parts: string[] = [];
  if (slot.outline && slot.outline.width > 0) {
    const w = slot.outline.width * scale;
    const c = slot.outline.color;
    for (const [dx, dy] of [[-w, 0], [w, 0], [0, -w], [0, w], [-w, -w], [w, -w], [-w, w], [w, w]])
      parts.push(`${dx}px ${dy}px 0 ${c}`);
  }
  if (slot.shadow) {
    const h = slot.shadow.color.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    parts.push(`0px 0px ${slot.shadow.blur * scale}px rgba(${r},${g},${b},${slot.shadow.opacity})`);
  }
  return parts.length ? parts.join(", ") : undefined;
}

export function DomEditor({ layout, values, overrides, onOverridesChange, onTextChange, photo, logoUrl, exportRef }: Props) {
  const scale = DISPLAY_W / layout.canvas.width;
  const displayH = layout.canvas.height * scale;
  const slots = textSlots(layout);
  const [selId, setSelId] = useState<string>(slots[0]?.id ?? "");
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const sel = slots.find((s) => s.id === selId) ?? slots[0];

  function patchSlot(id: string, patch: Record<string, unknown>) {
    const cur = overrides.slots[id] ?? {};
    onOverridesChange({ ...overrides, slots: { ...overrides.slots, [id]: { ...cur, ...patch } } });
  }

  // drag (menulis box.x/box.y dalam koordinat kanvas 1080)
  function onPointerDown(e: React.PointerEvent, slot: TextSlot) {
    setSelId(slot.id);
    const rect = stageRef.current!.getBoundingClientRect();
    dragRef.current = {
      id: slot.id,
      dx: e.clientX - (rect.left + slot.box.x * scale),
      dy: e.clientY - (rect.top + slot.box.y * scale),
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current; if (!d) return;
    const rect = stageRef.current!.getBoundingClientRect();
    const slot = slots.find((s) => s.id === d.id)!;
    const x = Math.max(0, Math.min(layout.canvas.width - 10, (e.clientX - d.dx - rect.left) / scale));
    const y = Math.max(0, Math.min(layout.canvas.height - 10, (e.clientY - d.dy - rect.top) / scale));
    patchSlot(d.id, { box: { x, y, width: slot.box.width, height: slot.box.height } });
  }
  function onPointerUp() { dragRef.current = null; }

  return (
    <div>
      <div className="mx-auto" style={{ width: DISPLAY_W }}>
        {/* KANVAS — inilah yang dipotret saat Simpan */}
        <div
          ref={(el) => { stageRef.current = el; (exportRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            position: "relative", width: DISPLAY_W, height: displayH,
            borderRadius: 10, overflow: "hidden", background: "#111", touchAction: "none",
          }}
        >
          {photo && (
            <img src={photo} alt="" crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )}

          {slots.map((slot) => {
            const value = values[slot.id] ?? slot.placeholder ?? "";
            const fitted = fitFontSize(value, {
              boxWidth: slot.box.width, boxHeight: slot.box.height,
              maxFontSize: slot.maxFontSize, minFontSize: slot.minFontSize, lineHeight: 1,
            });
            const justify = slot.align === "left" ? "flex-start" : slot.align === "right" ? "flex-end" : "center";
            return (
              <div key={slot.id}
                onPointerDown={(e) => onPointerDown(e, slot)}
                style={{
                  position: "absolute", left: slot.box.x * scale, top: slot.box.y * scale,
                  width: slot.box.width * scale, height: slot.box.height * scale,
                  display: "flex", alignItems: "flex-start", justifyContent: justify,
                  cursor: "grab",
                  outline: selId === slot.id ? "1.5px dashed #12B3A0" : "none", outlineOffset: 2,
                }}>
                <div style={{
                  fontFamily: `"${slot.fontFamily}"`, fontSize: fitted * scale,
                  fontWeight: slot.fontWeight ?? 400, color: slot.color, textAlign: slot.align,
                  lineHeight: 1, textShadow: buildTextShadow(slot, scale), whiteSpace: "pre-wrap",
                }}>{value}</div>
              </div>
            );
          })}

          {logoUrl && (() => {
            const lg = overrides.logo ?? layout.logo;
            return <img src={logoUrl} alt="" crossOrigin="anonymous"
              style={{ position: "absolute", left: lg.x * scale, top: lg.y * scale, width: lg.size * scale, height: lg.size * scale, objectFit: "contain" }} />;
          })()}
        </div>
        <p className="mt-2 text-xs text-navy/50">Seret teks langsung di gambar. Pilih slot di bawah untuk mengatur.</p>
      </div>

      {/* KONTROL slot terpilih */}
      {sel && (
        <div className="mt-3 rounded-xl border border-navy/10 p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {slots.map((s) => (
              <button key={s.id} type="button" onClick={() => setSelId(s.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${selId === s.id ? "bg-primary text-white" : "bg-navy/10 text-navy"}`}>
                {s.label ?? s.id}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input type="text" value={values[sel.id] ?? ""} onChange={(e) => onTextChange?.(sel.id, e.target.value)}
              className="min-w-[140px] flex-1 rounded-lg border border-navy/15 px-2 py-1.5" placeholder="Teks…" />
            <select value={sel.fontFamily} onChange={(e) => patchSlot(sel.id, { fontFamily: e.target.value })}
              className="rounded-lg border border-navy/15 px-2 py-1.5">
              {FONT_OPTIONS.map((f) => <option key={f.id} value={f.family}>{f.family}</option>)}
            </select>
            <input type="range" min={12} max={140} value={sel.maxFontSize}
              onChange={(e) => patchSlot(sel.id, { fontSize: Number(e.target.value) })} />
            <input type="color" value={/^#/.test(sel.color) ? sel.color.slice(0, 7) : "#ffffff"}
              onChange={(e) => patchSlot(sel.id, { color: e.target.value })}
              className="h-8 w-9 rounded border border-navy/15" />
          </div>
        </div>
      )}
    </div>
  );
}

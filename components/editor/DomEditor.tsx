"use client";

import { useRef, useState } from "react";
import type { TemplateLayout, TextSlot, Decoration, FooterSocial } from "@/lib/templates/types";
import type { EditorOverrides } from "@/lib/editor/layoutOverrides";
import { fitFontSize } from "@/lib/render/fitText";
import { FONT_OPTIONS } from "@/lib/templates/fonts";

/**
 * DomEditor — EDITOR SATU-MESIN (uji admin). Edit = hasil (dipotret html-to-image).
 * Lapis 1: foto + dekorasi/scrim + teks + footer/sosmed + logo (terang/gelap).
 * Belum: badge pesan-antar & sertifikasi, snap. (menyusul)
 *
 * `layout` sudah memuat semua override (posisi footer/logo dsb) dari
 * applyEditorOverrides — jadi tinggal digambar; geser menulis balik ke overrides.
 */

const DISPLAY_W = 340;
const MAX_SOCIALS = 3;

type Props = {
  layout: TemplateLayout;
  values: Record<string, string>;
  overrides: EditorOverrides;
  onOverridesChange: (o: EditorOverrides) => void;
  onTextChange?: (slotId: string, value: string) => void;
  photo: string | null;
  logoUrl?: string | null;
  socials?: FooterSocial[];
  businessName?: string;
  logoVariant?: "dark" | "light";
  canToggleLogo?: boolean;
  onLogoVariantChange?: (v: "dark" | "light") => void;
  exportRef: React.RefObject<HTMLDivElement | null>;
};

function textSlots(layout: TemplateLayout): TextSlot[] {
  return layout.slots.filter((s): s is TextSlot => s.type === "text");
}

function buildTextShadow(slot: TextSlot, scale: number): string | undefined {
  const parts: string[] = [];
  if (slot.outline && slot.outline.width > 0) {
    const w = slot.outline.width * scale, c = slot.outline.color;
    for (const [dx, dy] of [[-w,0],[w,0],[0,-w],[0,w],[-w,-w],[w,-w],[-w,w],[w,w]])
      parts.push(`${dx}px ${dy}px 0 ${c}`);
  }
  if (slot.shadow) {
    const h = slot.shadow.color.replace("#","");
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    parts.push(`0px 0px ${slot.shadow.blur*scale}px rgba(${r},${g},${b},${slot.shadow.opacity})`);
  }
  return parts.length ? parts.join(", ") : undefined;
}

function DecoView({ d, scale }: { d: Decoration; scale: number }) {
  const base: React.CSSProperties = {
    position: "absolute", left: d.box.x*scale, top: d.box.y*scale,
    width: d.box.width*scale, height: d.box.height*scale, opacity: d.opacity ?? 1,
    ...(d.rotateDeg ? { transform: `rotate(${d.rotateDeg}deg)` } : {}),
  };
  const bg = d.color.startsWith("linear-gradient") ? { backgroundImage: d.color } : { backgroundColor: d.color };
  if (d.shape === "circle") return <div style={{ ...base, ...bg, borderRadius: 9999 }} />;
  if (d.shape === "rect") return <div style={{ ...base, ...bg, borderRadius: (d.borderRadius ?? 0)*scale,
    ...(d.borderStyle ? { borderStyle: d.borderStyle, borderWidth: (d.borderWidth ?? 2)*scale, borderColor: d.borderColor ?? d.color } : {}) }} />;
  return <div style={{ ...base, display:"flex", alignItems:"center", justifyContent:"center" }}>
    <div style={{ fontFamily:"Inter", fontSize:(d.fontSize ?? 200)*scale, fontWeight:d.fontWeight ?? 800, color:d.color }}>{d.content ?? ""}</div>
  </div>;
}

export function DomEditor({
  layout, values, overrides, onOverridesChange, onTextChange, photo, logoUrl,
  socials = [], businessName, logoVariant = "light", canToggleLogo, onLogoVariantChange, exportRef,
}: Props) {
  const scale = DISPLAY_W / layout.canvas.width;
  const displayH = layout.canvas.height * scale;
  const slots = textSlots(layout);
  const [selId, setSelId] = useState<string>(slots[0]?.id ?? "");
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ kind: "slot"|"footer"|"logo"; id?: string; dx: number; dy: number } | null>(null);

  const sel = slots.find((s) => s.id === selId) ?? slots[0];
  const decos = layout.decorations ?? [];
  const backDecos = decos.filter((d) => (d.layer ?? "back") === "back");
  const frontDecos = decos.filter((d) => d.layer === "front");
  const fl = layout.footerLayout;
  const isColumn = fl.direction === "column";
  const visSocials = socials.slice(0, MAX_SOCIALS);

  function patchSlot(id: string, patch: Record<string, unknown>) {
    const cur = overrides.slots[id] ?? {};
    onOverridesChange({ ...overrides, slots: { ...overrides.slots, [id]: { ...cur, ...patch } } });
  }

  // drag universal (koordinat kanvas 1080)
  function startDrag(e: React.PointerEvent, kind: "slot"|"footer"|"logo", curX: number, curY: number, id?: string) {
    const rect = stageRef.current!.getBoundingClientRect();
    dragRef.current = { kind, id, dx: e.clientX - (rect.left + curX*scale), dy: e.clientY - (rect.top + curY*scale) };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current; if (!d) return;
    const rect = stageRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(layout.canvas.width-10, (e.clientX - d.dx - rect.left)/scale));
    const y = Math.max(0, Math.min(layout.canvas.height-10, (e.clientY - d.dy - rect.top)/scale));
    if (d.kind === "slot" && d.id) {
      const s = slots.find((x2) => x2.id === d.id)!;
      patchSlot(d.id, { box: { x, y, width: s.box.width, height: s.box.height } });
    } else if (d.kind === "footer") {
      onOverridesChange({ ...overrides, footer: { ...(overrides.footer ?? {}), x, y } });
    } else if (d.kind === "logo") {
      onOverridesChange({ ...overrides, logo: { ...layout.logo, ...(overrides.logo ?? {}), x, y } });
    }
  }
  function onPointerUp() { dragRef.current = null; }

  return (
    <div>
      <div className="mx-auto" style={{ width: DISPLAY_W }}>
        <div ref={(el) => { stageRef.current = el; (exportRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          style={{ position:"relative", width:DISPLAY_W, height:displayH, borderRadius:10, overflow:"hidden", background:"#111", touchAction:"none" }}>

          {/* dekorasi belakang */}
          {backDecos.map((d, i) => <DecoView key={"b"+i} d={d} scale={scale} />)}

          {/* foto */}
          {photo && <img src={photo} alt="" crossOrigin="anonymous"
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />}

          {/* dekorasi depan (scrim) */}
          {frontDecos.map((d, i) => <DecoView key={"f"+i} d={d} scale={scale} />)}

          {/* teks */}
          {slots.map((slot) => {
            const value = values[slot.id] ?? slot.placeholder ?? "";
            const fitted = fitFontSize(value, { boxWidth:slot.box.width, boxHeight:slot.box.height, maxFontSize:slot.maxFontSize, minFontSize:slot.minFontSize, lineHeight:1 });
            const justify = slot.align === "left" ? "flex-start" : slot.align === "right" ? "flex-end" : "center";
            return (
              <div key={slot.id} onPointerDown={(e)=>{ setSelId(slot.id); startDrag(e,"slot",slot.box.x,slot.box.y,slot.id); }}
                style={{ position:"absolute", left:slot.box.x*scale, top:slot.box.y*scale, width:slot.box.width*scale, height:slot.box.height*scale,
                  display:"flex", alignItems:"flex-start", justifyContent:justify, cursor:"grab",
                  outline: selId===slot.id ? "1.5px dashed #12B3A0" : "none", outlineOffset:2 }}>
                <div style={{ fontFamily:`"${slot.fontFamily}"`, fontSize:fitted*scale, fontWeight:slot.fontWeight ?? 400,
                  color:slot.color, textAlign:slot.align, lineHeight:1, textShadow:buildTextShadow(slot,scale), whiteSpace:"pre-wrap" }}>{value}</div>
              </div>
            );
          })}

          {/* footer: nama + sosmed */}
          {(visSocials.length > 0 || businessName) && (
            <div onPointerDown={(e)=>startDrag(e,"footer",fl.x,fl.y)}
              style={{ position:"absolute", left:fl.x*scale, top:fl.y*scale, cursor:"grab" }}>
              {businessName && (
                <div style={{ position:"absolute", top:-(isColumn?30:34)*scale, left:0, whiteSpace:"nowrap",
                  fontFamily:"Poppins", fontWeight:700, fontSize:Math.max(18, Math.round(fl.textSize*0.9))*scale, color:fl.nameColor }}>
                  {businessName}
                </div>
              )}
              <div style={{ display:"flex", flexDirection:isColumn?"column":"row", alignItems:isColumn?(fl.align ?? "flex-start"):"center", gap:fl.gap*scale }}>
                {visSocials.map((s) => (
                  <div key={s.platformId} style={{ display:"flex", flexDirection:"row", alignItems:"center", gap:10*scale }}>
                    <img src={`/icons/${s.platformId}.png`} alt="" width={fl.iconSize*scale} height={fl.iconSize*scale}
                      style={{ objectFit:"contain", borderRadius:Math.round(fl.iconSize*0.28)*scale }} />
                    <div style={{ fontFamily:"Inter", fontWeight:600, fontSize:fl.textSize*scale, color:fl.textColor, whiteSpace:"nowrap" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* logo (dobel-klik: ganti terang/gelap) */}
          {logoUrl && (() => {
            const lg = { ...layout.logo, ...(overrides.logo ?? {}) };
            return <img src={logoUrl} alt="" crossOrigin="anonymous"
              onPointerDown={(e)=>startDrag(e,"logo",lg.x,lg.y)}
              onDoubleClick={()=> canToggleLogo && onLogoVariantChange?.(logoVariant==="light"?"dark":"light")}
              style={{ position:"absolute", left:lg.x*scale, top:lg.y*scale, width:lg.size*scale, height:lg.size*scale, objectFit:"contain", cursor:"grab" }} />;
          })()}
        </div>
        <p className="mt-2 text-xs text-navy/50">Seret teks/footer/logo langsung. Dobel-klik logo untuk ganti terang/gelap.</p>
      </div>

      {/* kontrol slot terpilih */}
      {sel && (
        <div className="mt-3 rounded-xl border border-navy/10 p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {slots.map((s) => (
              <button key={s.id} type="button" onClick={()=>setSelId(s.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${selId===s.id?"bg-primary text-white":"bg-navy/10 text-navy"}`}>
                {s.label ?? s.id}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input type="text" value={values[sel.id] ?? ""} onChange={(e)=>onTextChange?.(sel.id, e.target.value)}
              className="min-w-[140px] flex-1 rounded-lg border border-navy/15 px-2 py-1.5" placeholder="Teks…" />
            <select value={sel.fontFamily} onChange={(e)=>patchSlot(sel.id, { fontFamily: e.target.value })}
              className="rounded-lg border border-navy/15 px-2 py-1.5">
              {FONT_OPTIONS.map((f) => <option key={f.id} value={f.family}>{f.family}</option>)}
            </select>
            <input type="range" min={12} max={140} value={sel.maxFontSize} onChange={(e)=>patchSlot(sel.id, { fontSize: Number(e.target.value) })} />
            <input type="color" value={/^#/.test(sel.color) ? sel.color.slice(0,7) : "#ffffff"} onChange={(e)=>patchSlot(sel.id, { color: e.target.value })}
              className="h-8 w-9 rounded border border-navy/15" />
          </div>
        </div>
      )}
    </div>
  );
}

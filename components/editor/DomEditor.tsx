"use client";

import { useRef, useState } from "react";
import type { TemplateLayout, TextSlot, Decoration, FooterSocial } from "@/lib/templates/types";
import type { EditorOverrides } from "@/lib/editor/layoutOverrides";
import { fitFontSize } from "@/lib/render/fitText";
import { FONT_OPTIONS } from "@/lib/templates/fonts";
import { DELIVERY_PLATFORMS, DELIVERY_MAP } from "@/lib/social/delivery";
import { CERT_BADGES, CERT_BADGE_MAP, CERT_BADGE_H, CERT_BADGE_GAP } from "@/lib/social/badges";

/**
 * DomEditor v3 — EDITOR SATU-MESIN. Edit = hasil (dipotret html-to-image).
 * v3 (kemulusan & fitur):
 * - DRAG MULUS: saat geser, posisi diubah LANGSUNG di DOM (tanpa setState per
 *   gerakan → tanpa re-render berat); overrides di-commit SEKALI saat lepas.
 * - Gambar bisa digeser: semua <img> draggable=false + pointerEvents none —
 *   wrapper-nya yang menerima pointer (fix "elemen bergambar susah digerakkan").
 * - SNAP + garis bantu: nempel ke tengah kanvas (H & V) dan tepi, garis teal
 *   putus-putus muncul saat nempel (overlay data-noexport, tak ikut terpotret).
 * - Nudge keyboard: panah = geser 2px, Shift+panah = 10px (slot terpilih).
 * - Footer sosmed: toggle Mendatar/Menurun + slider ukuran ikon.
 * - Logo: slider ukuran.
 * Ekspor WAJIB pakai filter data-noexport (lihat konten/page.tsx).
 */

const DISPLAY_W = 340;
const MAX_SOCIALS = 3;
const DRAG_THRESHOLD_PX = 4;
const SNAP_PX = 8; // dalam px display

type DragKind = "slot" | "footer" | "logo" | "delivery" | "badges";

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
  const guideVRef = useRef<HTMLDivElement>(null);
  const guideHRef = useRef<HTMLDivElement>(null);
  // Elemen draggable — posisi diubah LANGSUNG saat drag (tanpa re-render).
  const elemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragRef = useRef<{
    kind: DragKind; id?: string; key: string;
    dx: number; dy: number;
    startClientX: number; startClientY: number; active: boolean;
    lastX: number; lastY: number;
    w: number; h: number;
  } | null>(null);
  // Deteksi dobel-tap logo manual — preventDefault di pointerdown mematikan
  // event dblclick bawaan, jadi dihitung sendiri (juga jalan di HP).
  const logoTapRef = useRef<number>(0);

  const sel = slots.find((s) => s.id === selId) ?? slots[0];
  const decos = layout.decorations ?? [];
  const backDecos = decos.filter((d) => (d.layer ?? "back") === "back");
  const frontDecos = decos.filter((d) => d.layer === "front");
  const fl = layout.footerLayout;
  const footerDirection = overrides.footer?.direction ?? fl.direction;
  const isColumn = footerDirection === "column";
  const footerIconSize = overrides.footer?.iconSize ?? fl.iconSize;
  const footerTextSize = overrides.footer?.textSize ?? fl.textSize;
  const visSocials = socials.slice(0, MAX_SOCIALS);

  // ----- delivery & cert badges -----
  const dScale = overrides.delivery?.scale ?? 1;
  const CHIP_H = 76 * dScale;
  const CHIP_W = Math.round(((76 * 130) / 104) * dScale);
  const DELIVERY_GAP = 14 * dScale;
  const DELIVERY_HEADING_H = 34 * dScale;
  const DELIVERY_HEADING_FONT = 28 * dScale;
  const deliveryIds = (overrides.delivery?.ids ?? []).filter((id) => DELIVERY_MAP[id]);
  const deliveryLabel = overrides.delivery?.label ?? "Available on";
  const deliveryDefaultY = Math.round(layout.canvas.height * 0.75);
  const deliveryX = overrides.delivery?.x ?? 60;
  const deliveryY = overrides.delivery?.y ?? deliveryDefaultY;
  const deliveryW = deliveryIds.length > 0 ? deliveryIds.length * CHIP_W + (deliveryIds.length - 1) * DELIVERY_GAP : 0;
  const deliveryH = DELIVERY_HEADING_H + CHIP_H;

  const bScale = overrides.badges?.scale ?? 1;
  const BADGE_H = CERT_BADGE_H * bScale;
  const BADGE_GAP = CERT_BADGE_GAP * bScale;
  const badgeIds = (overrides.badges?.ids ?? []).filter((id) => CERT_BADGE_MAP[id]);
  const badgeDefaultY = Math.round(layout.canvas.height * 0.62);
  const badgesX = overrides.badges?.x ?? 60;
  const badgesY = overrides.badges?.y ?? badgeDefaultY;
  let badgeOffset = 0;
  const badgeItems = badgeIds.map((id) => {
    const w = Math.round(BADGE_H * CERT_BADGE_MAP[id].aspect);
    const item = { id, offsetX: badgeOffset, w };
    badgeOffset += w + BADGE_GAP;
    return item;
  });
  const badgesW = badgeItems.length > 0 ? badgeOffset - BADGE_GAP : 0;

  const lg = { ...layout.logo, ...(overrides.logo ?? {}) };

  function toggleDelivery(id: string) {
    const cur = overrides.delivery;
    const ids = cur?.ids ?? [];
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    onOverridesChange({ ...overrides, delivery: { ids: next, x: cur?.x ?? 60, y: cur?.y ?? deliveryDefaultY, label: cur?.label, scale: cur?.scale } });
  }
  function toggleBadge(id: string) {
    const cur = overrides.badges;
    const ids = cur?.ids ?? [];
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    onOverridesChange({ ...overrides, badges: { ids: next, x: cur?.x ?? 60, y: cur?.y ?? badgeDefaultY, scale: cur?.scale } });
  }

  function patchSlot(id: string, patch: Record<string, unknown>) {
    const cur = overrides.slots[id] ?? {};
    onOverridesChange({ ...overrides, slots: { ...overrides.slots, [id]: { ...cur, ...patch } } });
  }

  function commitPosition(kind: DragKind, id: string | undefined, x: number, y: number) {
    if (kind === "slot" && id) {
      const s = slots.find((x2) => x2.id === id)!;
      patchSlot(id, { box: { x, y, width: s.box.width, height: s.box.height } });
    } else if (kind === "footer") {
      onOverridesChange({ ...overrides, footer: { ...(overrides.footer ?? {}), x, y } });
    } else if (kind === "logo") {
      onOverridesChange({ ...overrides, logo: { ...layout.logo, ...(overrides.logo ?? {}), x, y } });
    } else if (kind === "delivery") {
      onOverridesChange({ ...overrides, delivery: { ids: deliveryIds, label: overrides.delivery?.label, scale: overrides.delivery?.scale, x, y } });
    } else if (kind === "badges") {
      onOverridesChange({ ...overrides, badges: { ids: badgeIds, scale: overrides.badges?.scale, x, y } });
    }
  }

  function registerElem(key: string) {
    return (el: HTMLDivElement | null) => {
      if (el) elemRefs.current.set(key, el);
      else elemRefs.current.delete(key);
    };
  }

  function showGuide(ref: React.RefObject<HTMLDivElement | null>, show: boolean) {
    if (ref.current) ref.current.style.opacity = show ? "1" : "0";
  }

  // ----- drag: DOM langsung, commit sekali di pointerup -----
  function startDrag(e: React.PointerEvent, kind: DragKind, curX: number, curY: number, key: string, w: number, h: number, id?: string) {
    e.preventDefault(); // matikan native image-drag & seleksi teks
    const rect = stageRef.current!.getBoundingClientRect();
    dragRef.current = {
      kind, id, key,
      dx: e.clientX - (rect.left + curX*scale),
      dy: e.clientY - (rect.top + curY*scale),
      startClientX: e.clientX, startClientY: e.clientY,
      active: false, lastX: curX, lastY: curY, w, h,
    };
    stageRef.current!.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current; if (!d) return;
    if (!d.active) {
      const moved = Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY);
      if (moved < DRAG_THRESHOLD_PX) return;
      d.active = true;
      const el0 = elemRefs.current.get(d.key);
      if (el0) el0.style.cursor = "grabbing";
    }
    const rect = stageRef.current!.getBoundingClientRect();
    let x = (e.clientX - d.dx - rect.left) / scale;
    let y = (e.clientY - d.dy - rect.top) / scale;

    // SNAP: tengah kanvas (H & V) + 4 tepi (titik acuan = tengah/tepi elemen)
    const snapCanvas = SNAP_PX / scale;
    const cxCanvas = layout.canvas.width / 2;
    const cyCanvas = layout.canvas.height / 2;
    let snapV = false, snapH = false;
    if (Math.abs((x + d.w/2) - cxCanvas) < snapCanvas) { x = cxCanvas - d.w/2; snapV = true; }
    if (Math.abs((y + d.h/2) - cyCanvas) < snapCanvas) { y = cyCanvas - d.h/2; snapH = true; }
    if (Math.abs(x) < snapCanvas) x = 0;
    if (Math.abs(y) < snapCanvas) y = 0;
    if (Math.abs((x + d.w) - layout.canvas.width) < snapCanvas) x = layout.canvas.width - d.w;
    if (Math.abs((y + d.h) - layout.canvas.height) < snapCanvas) y = layout.canvas.height - d.h;

    // Batas: minimal 20px elemen tetap terlihat di dalam kanvas
    x = Math.max(-d.w + 20, Math.min(layout.canvas.width - 20, x));
    y = Math.max(-d.h + 20, Math.min(layout.canvas.height - 20, y));
    d.lastX = x; d.lastY = y;

    // Geser LANGSUNG di DOM — tanpa setState → mulus 60fps.
    const el = elemRefs.current.get(d.key);
    if (el) { el.style.left = `${x*scale}px`; el.style.top = `${y*scale}px`; }
    showGuide(guideVRef, snapV);
    showGuide(guideHRef, snapH);
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    dragRef.current = null;
    showGuide(guideVRef, false);
    showGuide(guideHRef, false);
    try { stageRef.current!.releasePointerCapture(e.pointerId); } catch { /* ok */ }
    if (d?.active) {
      const el = elemRefs.current.get(d.key);
      if (el) el.style.cursor = "grab";
      commitPosition(d.kind, d.id, Math.round(d.lastX), Math.round(d.lastY)); // commit SEKALI
    }
  }

  // ----- nudge keyboard (slot terpilih) -----
  function onKeyDown(e: React.KeyboardEvent) {
    if (!sel) return;
    const step = e.shiftKey ? 10 : 2;
    let dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    patchSlot(sel.id, { box: { x: sel.box.x + dx, y: sel.box.y + dy, width: sel.box.width, height: sel.box.height } });
  }

  const selBox = sel ? { x: sel.box.x*scale, y: sel.box.y*scale, w: sel.box.width*scale, h: sel.box.height*scale } : null;
  const IMG_STYLE: React.CSSProperties = { pointerEvents: "none", userSelect: "none" };

  return (
    <div>
      <div className="mx-auto" style={{ width: DISPLAY_W }}>
        <div ref={(el) => { stageRef.current = el; (exportRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown} tabIndex={0}
          style={{ position:"relative", width:DISPLAY_W, height:displayH, borderRadius:10, overflow:"hidden", background:"#111", touchAction:"none", outline:"none" }}>

          {backDecos.map((d, i) => <DecoView key={"b"+i} d={d} scale={scale} />)}

          {photo && <img src={photo} alt="" crossOrigin="anonymous" draggable={false}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", ...IMG_STYLE }} />}

          {frontDecos.map((d, i) => <DecoView key={"f"+i} d={d} scale={scale} />)}

          {/* teks */}
          {slots.map((slot) => {
            const value = values[slot.id] ?? slot.placeholder ?? "";
            const fitted = fitFontSize(value, { boxWidth:slot.box.width, boxHeight:slot.box.height, maxFontSize:slot.maxFontSize, minFontSize:slot.minFontSize, lineHeight:1 });
            const justify = slot.align === "left" ? "flex-start" : slot.align === "right" ? "flex-end" : "center";
            return (
              <div key={slot.id} ref={registerElem(`slot-${slot.id}`)}
                onPointerDown={(e)=>{ setSelId(slot.id); stageRef.current?.focus(); startDrag(e,"slot",slot.box.x,slot.box.y,`slot-${slot.id}`,slot.box.width,slot.box.height,slot.id); }}
                style={{ position:"absolute", left:slot.box.x*scale, top:slot.box.y*scale, width:slot.box.width*scale, height:slot.box.height*scale,
                  display:"flex", alignItems:"flex-start", justifyContent:justify, cursor:"grab" }}>
                <div style={{ fontFamily:`"${slot.fontFamily}"`, fontSize:fitted*scale, fontWeight:slot.fontWeight ?? 400,
                  color:slot.color, textAlign:slot.align, lineHeight:1, textShadow:buildTextShadow(slot,scale), whiteSpace:"pre-wrap", userSelect:"none" }}>{value}</div>
              </div>
            );
          })}

          {/* badge sertifikasi */}
          {badgeItems.length > 0 && (
            <div ref={registerElem("badges")}
              onPointerDown={(e)=>startDrag(e,"badges",badgesX,badgesY,"badges",badgesW,BADGE_H)}
              style={{ position:"absolute", left:badgesX*scale, top:badgesY*scale, width:badgesW*scale, height:BADGE_H*scale, cursor:"grab" }}>
              {badgeItems.map((it) => (
                <img key={it.id} src={`/badges/${it.id}.png`} alt="" crossOrigin="anonymous" draggable={false}
                  style={{ position:"absolute", left:it.offsetX*scale, top:0, width:it.w*scale, height:BADGE_H*scale, objectFit:"contain", ...IMG_STYLE }} />
              ))}
            </div>
          )}

          {/* badge pesan-antar */}
          {deliveryIds.length > 0 && (
            <div ref={registerElem("delivery")}
              onPointerDown={(e)=>startDrag(e,"delivery",deliveryX,deliveryY,"delivery",Math.max(deliveryW, 200),deliveryH)}
              style={{ position:"absolute", left:deliveryX*scale, top:deliveryY*scale, cursor:"grab" }}>
              <div style={{ fontFamily:"Inter", fontWeight:700, fontSize:DELIVERY_HEADING_FONT*scale, color:"#ffffff",
                height:DELIVERY_HEADING_H*scale, whiteSpace:"nowrap", userSelect:"none" }}>{deliveryLabel}</div>
              <div style={{ display:"flex", flexDirection:"row", gap:DELIVERY_GAP*scale, width:deliveryW*scale }}>
                {deliveryIds.map((id) => (
                  <img key={id} src={`/delivery/${id}.png`} alt="" crossOrigin="anonymous" draggable={false}
                    style={{ width:CHIP_W*scale, height:CHIP_H*scale, objectFit:"contain", ...IMG_STYLE }} />
                ))}
              </div>
            </div>
          )}

          {/* footer: nama + sosmed */}
          {(visSocials.length > 0 || businessName) && (
            <div ref={registerElem("footer")}
              onPointerDown={(e)=>startDrag(e,"footer",overrides.footer?.x ?? fl.x, overrides.footer?.y ?? fl.y,"footer",300,isColumn?visSocials.length*(footerIconSize+10):footerIconSize)}
              style={{ position:"absolute", left:(overrides.footer?.x ?? fl.x)*scale, top:(overrides.footer?.y ?? fl.y)*scale, cursor:"grab" }}>
              {businessName && (
                <div style={{ position:"absolute", top:-(isColumn?30:34)*scale, left:0, whiteSpace:"nowrap",
                  fontFamily:"Poppins", fontWeight:700, fontSize:Math.max(18, Math.round(footerTextSize*0.9))*scale, color:fl.nameColor, userSelect:"none" }}>
                  {businessName}
                </div>
              )}
              <div style={{ display:"flex", flexDirection:isColumn?"column":"row", alignItems:isColumn?(fl.align ?? "flex-start"):"center", gap:(overrides.footer?.gap ?? fl.gap)*scale }}>
                {visSocials.map((s) => (
                  <div key={s.platformId} style={{ display:"flex", flexDirection:"row", alignItems:"center", gap:10*scale }}>
                    <img src={`/icons/${s.platformId}.png`} alt="" width={footerIconSize*scale} height={footerIconSize*scale} draggable={false}
                      style={{ objectFit:"contain", borderRadius:Math.round(footerIconSize*0.28)*scale, ...IMG_STYLE }} />
                    <div style={{ fontFamily:"Inter", fontWeight:600, fontSize:footerTextSize*scale, color:fl.textColor, whiteSpace:"nowrap", userSelect:"none" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* logo — dibungkus div: img pointerEvents none, wrapper terima drag */}
          {logoUrl && (
            <div ref={registerElem("logo")}
              onPointerDown={(e)=>{
                const now = Date.now();
                if (now - logoTapRef.current < 320) {
                  logoTapRef.current = 0;
                  if (canToggleLogo) onLogoVariantChange?.(logoVariant==="light"?"dark":"light");
                  return; // dobel-tap = ganti varian, jangan mulai drag
                }
                logoTapRef.current = now;
                startDrag(e,"logo",lg.x,lg.y,"logo",lg.size,lg.size);
              }}
              style={{ position:"absolute", left:lg.x*scale, top:lg.y*scale, width:lg.size*scale, height:lg.size*scale, cursor:"grab" }}>
              <img src={logoUrl} alt="" crossOrigin="anonymous" draggable={false}
                style={{ width:"100%", height:"100%", objectFit:"contain", ...IMG_STYLE }} />
            </div>
          )}

          {/* garis bantu snap — data-noexport, dikontrol via ref (tanpa re-render) */}
          <div ref={guideVRef} data-noexport="1" style={{ position:"absolute", left:DISPLAY_W/2-0.5, top:0, width:1, height:"100%",
            borderLeft:"1.5px dashed #12B3A0", opacity:0, pointerEvents:"none", transition:"opacity 80ms" }} />
          <div ref={guideHRef} data-noexport="1" style={{ position:"absolute", top:displayH/2-0.5, left:0, height:1, width:"100%",
            borderTop:"1.5px dashed #12B3A0", opacity:0, pointerEvents:"none", transition:"opacity 80ms" }} />

          {/* kotak seleksi — data-noexport */}
          {selBox && (
            <div data-noexport="1" style={{ position:"absolute", left:selBox.x-3, top:selBox.y-3, width:selBox.w+6, height:selBox.h+6,
              border:"1.5px dashed #12B3A0", borderRadius:4, pointerEvents:"none" }} />
          )}
        </div>
        <p className="mt-2 text-xs text-navy/50">Seret elemen langsung — nempel otomatis ke tengah/tepi. Panah = geser halus (Shift = cepat). Dobel-klik logo: terang/gelap.</p>
      </div>

      {/* footer sosmed: arah + ukuran */}
      {(visSocials.length > 0 || businessName) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-navy">Sosmed:</span>
          <button type="button" onClick={()=>onOverridesChange({ ...overrides, footer: { x: fl.x, y: fl.y, ...(overrides.footer ?? {}), direction: "row" } })}
            className={`rounded-lg border px-2.5 py-1 font-medium ${!isColumn?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>Mendatar</button>
          <button type="button" onClick={()=>onOverridesChange({ ...overrides, footer: { x: fl.x, y: fl.y, ...(overrides.footer ?? {}), direction: "column" } })}
            className={`rounded-lg border px-2.5 py-1 font-medium ${isColumn?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>Menurun</button>
          <span className="ml-1 text-navy/50">Ukuran:</span>
          <input type="range" min={24} max={72} value={footerIconSize} title="Ukuran ikon sosmed"
            onChange={(e)=>{ const v = Number(e.target.value); onOverridesChange({ ...overrides, footer: { x: fl.x, y: fl.y, ...(overrides.footer ?? {}), iconSize: v, textSize: Math.round(v*0.62) } }); }} />
        </div>
      )}

      {/* logo: ukuran */}
      {logoUrl && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-navy">Logo — Ukuran:</span>
          <input type="range" min={40} max={280} value={lg.size} title="Ukuran logo"
            onChange={(e)=>onOverridesChange({ ...overrides, logo: { ...layout.logo, ...(overrides.logo ?? {}), size: Number(e.target.value) } })} />
        </div>
      )}

      {/* toggle badge pesan-antar + sertifikasi */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-navy">Pesan-antar:</span>
        {DELIVERY_PLATFORMS.map((p) => (
          <button key={p.id} type="button" onClick={()=>toggleDelivery(p.id)}
            className={`rounded-full border px-3 py-1 font-medium ${deliveryIds.includes(p.id)?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>
            {p.label}
          </button>
        ))}
        {deliveryIds.length > 0 && (
          <input type="range" min={50} max={200} value={Math.round(dScale*100)} title="Ukuran badge pesan-antar"
            onChange={(e)=>onOverridesChange({ ...overrides, delivery: { ids: deliveryIds, x: deliveryX, y: deliveryY, label: overrides.delivery?.label, scale: Number(e.target.value)/100 } })} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-navy">Sertifikasi:</span>
        {CERT_BADGES.map((b) => (
          <button key={b.id} type="button" onClick={()=>toggleBadge(b.id)}
            className={`rounded-full border px-3 py-1 font-medium ${badgeIds.includes(b.id)?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>
            {b.label}
          </button>
        ))}
        {badgeIds.length > 0 && (
          <input type="range" min={50} max={200} value={Math.round(bScale*100)} title="Ukuran badge sertifikasi"
            onChange={(e)=>onOverridesChange({ ...overrides, badges: { ids: badgeIds, x: badgesX, y: badgesY, scale: Number(e.target.value)/100 } })} />
        )}
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
            <input type="range" min={12} max={140} value={sel.maxFontSize} title="Ukuran font"
              onChange={(e)=>patchSlot(sel.id, { fontSize: Number(e.target.value) })} />
            <input type="color" value={/^#/.test(sel.color) ? sel.color.slice(0,7) : "#ffffff"} onChange={(e)=>patchSlot(sel.id, { color: e.target.value })}
              className="h-8 w-9 rounded border border-navy/15" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-navy/70">Rata:</span>
            {(["left","center","right"] as const).map((a) => (
              <button key={a} type="button" onClick={()=>patchSlot(sel.id, { align: a })}
                className={`rounded-lg border px-2.5 py-1 font-medium ${sel.align===a?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>
                {a === "left" ? "Kiri" : a === "center" ? "Tengah" : "Kanan"}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 font-medium text-navy/70">
              <input type="checkbox" checked={!!sel.shadow}
                onChange={(e)=>patchSlot(sel.id, { shadow: e.target.checked ? { blur: 8, color: "#000000", opacity: 0.6 } : null })} />
              Shadow
            </label>
            {sel.shadow && (
              <>
                <input type="range" min={0} max={40} value={sel.shadow.blur} title="Blur"
                  onChange={(e)=>patchSlot(sel.id, { shadow: { ...sel.shadow!, blur: Number(e.target.value) } })} />
                <input type="color" value={sel.shadow.color}
                  onChange={(e)=>patchSlot(sel.id, { shadow: { ...sel.shadow!, color: e.target.value } })}
                  className="h-7 w-8 rounded border border-navy/15" />
                <input type="range" min={10} max={100} value={Math.round(sel.shadow.opacity*100)} title="Opasitas"
                  onChange={(e)=>patchSlot(sel.id, { shadow: { ...sel.shadow!, opacity: Number(e.target.value)/100 } })} />
              </>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 font-medium text-navy/70">
              <input type="checkbox" checked={!!(sel.outline && sel.outline.width > 0)}
                onChange={(e)=>patchSlot(sel.id, { outline: e.target.checked ? { width: 3, color: "#000000" } : null })} />
              Outline
            </label>
            {sel.outline && sel.outline.width > 0 && (
              <>
                <input type="range" min={1} max={10} value={sel.outline.width} title="Tebal"
                  onChange={(e)=>patchSlot(sel.id, { outline: { ...sel.outline!, width: Number(e.target.value) } })} />
                <input type="color" value={sel.outline.color}
                  onChange={(e)=>patchSlot(sel.id, { outline: { ...sel.outline!, color: e.target.value } })}
                  className="h-7 w-8 rounded border border-navy/15" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateLayout, TextSlot, Decoration, FooterSocial } from "@/lib/templates/types";
import type { EditorOverrides, ElementFx, FreeItem, OverlayFx } from "@/lib/editor/layoutOverrides";
import { fitFontSize } from "@/lib/render/fitText";
import { FONT_OPTIONS } from "@/lib/templates/fonts";
import { DELIVERY_PLATFORMS, DELIVERY_MAP } from "@/lib/social/delivery";
import { CERT_BADGES, CERT_BADGE_MAP, CERT_BADGE_H, CERT_BADGE_GAP } from "@/lib/social/badges";

/**
 * DomEditor v4 — EDITOR SATU-MESIN. Edit = hasil (dipotret html-to-image).
 * Baru di v4:
 * - OPACITY, ROTASI, LAYER (naik/turun) untuk SEMUA elemen — via overrides.fx.
 * - RESIZE: handle kotak di pojok kanan-bawah elemen terpilih (slot/logo/item).
 * - UNDO/REDO: tombol ↶ ↷ + Ctrl+Z / Ctrl+Shift+Z (riwayat overrides, maks 50).
 * - ELEMEN BEBAS: + Teks / + Gambar (stiker) — overrides.items, bisa dihapus.
 * - OVERLAY: lapisan warna/gradient di atas foto (gelap bawah/atas/penuh).
 * Dari v3 (dipertahankan): drag mulus via DOM langsung, snap tengah/tepi +
 * garis bantu, nudge panah, dobel-tap logo, footer/badge slider.
 * CATATAN: fitur v4 hanya hidup di jalur export html-to-image. Fallback
 * Satori (/api/render) MENGABAIKAN fx/items/overlay — hasil tetap tersimpan,
 * hanya tanpa efek v4. (Lihat audit di CARA-PASANG-EDITOR-V4.md.)
 * Ekspor WAJIB pakai filter data-noexport (lihat konten/page.tsx).
 */

const DISPLAY_W = 340;
const MAX_SOCIALS = 3;
const MAX_ITEMS = 10;
const DRAG_THRESHOLD_PX = 4;
const SNAP_PX = 8; // dalam px display
const HIST_MAX = 50;
const HIST_COALESCE_MS = 600;

// Urutan layer bawaan (sebelum user mengubah lewat tombol Naik/Turun).
const DEFAULT_Z: Record<string, number> = { slot: 10, badges: 12, delivery: 13, footer: 14, logo: 15, item: 20 };
const OVERLAY_Z = 6;
const FRONT_DECO_Z = 8;

type DragKind = "slot" | "footer" | "logo" | "delivery" | "badges" | "item";

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

type ShadowOutlineShape = {
  shadow?: { blur: number; color: string; opacity: number } | null;
  outline?: { width: number; color: string } | null;
};

function buildTextShadow(slot: ShadowOutlineShape, scale: number): string | undefined {
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

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0,2),16) || 0, g = parseInt(h.slice(2,4),16) || 0, b = parseInt(h.slice(4,6),16) || 0;
  return `rgba(${r},${g},${b},${opacity})`;
}

function DecoView({ d, scale, z }: { d: Decoration; scale: number; z?: number }) {
  const base: React.CSSProperties = {
    position: "absolute", left: d.box.x*scale, top: d.box.y*scale,
    width: d.box.width*scale, height: d.box.height*scale, opacity: d.opacity ?? 1,
    ...(z !== undefined ? { zIndex: z } : {}),
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

/**
 * Kontrol slider yang di-collapse jadi TOMBOL — hemat tempat di panel mobile
 * (dulu semua slider selalu terbuka & makan banyak ruang vertikal). Tombolnya
 * dikasih warna beda (teal) biar kelihatan jelas itu bisa diklik, bukan cuma
 * label statis. Klik tombol untuk buka/tutup slider di bawahnya.
 */
function SliderToggle({ label, valueLabel, children }: { label: string; valueLabel?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-semibold sm:px-2.5 sm:py-1 ${
          open ? "border-primary bg-primary/10 text-primary" : "border-primary/30 bg-primary/5 text-primary/80"
        }`}>
        <span>{label}{valueLabel ? `: ${valueLabel}` : ""}</span>
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="pl-0.5">{children}</div>}
    </div>
  );
}

export function DomEditor({
  layout, values, overrides, onOverridesChange, onTextChange, photo, logoUrl,
  socials = [], businessName, logoVariant = "light", canToggleLogo, onLogoVariantChange, exportRef,
}: Props) {
  // Lebar kanvas RESPONSIF — sebelumnya DISPLAY_W konstan 340px, tidak pernah
  // mengecil di HP. Padding horizontal total di sekitar editor ternyata DUA
  // LAPIS, bukan satu (ketemu setelah audit lanjutan): <main> di
  // app/konten/page.tsx pakai px-6 (24px×2=48px), DAN komponen <Card> yang
  // membungkus editor pakai p-6 SENDIRI (24px×2=48px lagi, di DALAM padding
  // main) — totalnya 96px, bukan 48px seperti perkiraan pertama (itu sebabnya
  // fix pertama masih overflow di HP). MARGIN sekarang 104px (96px + jarak
  // aman ekstra 8px).
  const [displayW, setDisplayW] = useState(DISPLAY_W);
  useEffect(() => {
    function recalc() {
      const margin = 104;
      setDisplayW(Math.max(220, Math.min(DISPLAY_W, window.innerWidth - margin)));
    }
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("orientationchange", recalc);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("orientationchange", recalc);
    };
  }, []);
  const scale = displayW / layout.canvas.width;
  const displayH = layout.canvas.height * scale;
  const slots = textSlots(layout);
  // selKey: "slot-<id>" | "logo" | "footer" | "delivery" | "badges" | "item-<id>" | ""
  const [selKey, setSelKey] = useState<string>(slots[0] ? `slot-${slots[0].id}` : "");
  // Dobel-klik teks → ketik langsung di kanvas (contentEditable, commit saat blur/Enter)
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (editingKey && editRef.current) {
      editRef.current.focus();
      const r = document.createRange();
      r.selectNodeContents(editRef.current);
      r.collapse(false); // kursor di akhir teks
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
  }, [editingKey]);
  const stageRef = useRef<HTMLDivElement>(null);
  const guideVRef = useRef<HTMLDivElement>(null);
  const guideHRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Elemen draggable — posisi diubah LANGSUNG saat drag (tanpa re-render).
  const elemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragRef = useRef<{
    kind: DragKind; id?: string; key: string;
    dx: number; dy: number;
    startClientX: number; startClientY: number; active: boolean;
    lastX: number; lastY: number;
    w: number; h: number;
  } | null>(null);
  const resizeRef = useRef<{
    key: string; startClientX: number; startClientY: number;
    startW: number; startH: number; startSize: number; startFont: number;
  } | null>(null);
  const logoTapRef = useRef<number>(0);
  // Deteksi dobel-tap manual untuk teks — event dblclick bawaan tidak sampai
  // ke elemen karena pointer capture dipegang stage saat drag.
  const tapRef = useRef<{ key: string; t: number }>({ key: "", t: 0 });
  // ----- riwayat undo/redo (snapshot overrides) -----
  const histRef = useRef<{ past: EditorOverrides[]; future: EditorOverrides[]; lastPush: number }>(
    { past: [], future: [], lastPush: 0 },
  );
  const [, forceHist] = useState(0); // supaya tombol undo/redo ikut enable/disable

  function pushHist() {
    const h = histRef.current;
    h.past.push(overrides);
    if (h.past.length > HIST_MAX) h.past.shift();
    h.future = [];
    h.lastPush = Date.now();
    forceHist((n) => n + 1);
  }
  /** Commit + push riwayat (dirapel 600ms supaya geser slider = 1 langkah undo). */
  function commit(next: EditorOverrides) {
    if (Date.now() - histRef.current.lastPush > HIST_COALESCE_MS) pushHist();
    onOverridesChange(next);
  }
  function undo() {
    const h = histRef.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(overrides);
    h.lastPush = 0;
    onOverridesChange(prev);
    forceHist((n) => n + 1);
  }
  function redo() {
    const h = histRef.current;
    const nxt = h.future.pop();
    if (!nxt) return;
    h.past.push(overrides);
    h.lastPush = 0;
    onOverridesChange(nxt);
    forceHist((n) => n + 1);
  }

  const selSlot = selKey.startsWith("slot-") ? slots.find((s) => `slot-${s.id}` === selKey) : undefined;
  const items = overrides.items ?? [];
  const selItem = selKey.startsWith("item-") ? items.find((it) => `item-${it.id}` === selKey) : undefined;
  const decos = layout.decorations ?? [];
  const backDecos = decos.filter((d) => (d.layer ?? "back") === "back");
  const frontDecos = decos.filter((d) => d.layer === "front");
  const fl = layout.footerLayout;
  const footerDirection = overrides.footer?.direction ?? fl.direction;
  const isColumn = footerDirection === "column";
  const footerIconSize = overrides.footer?.iconSize ?? fl.iconSize;
  const footerTextSize = overrides.footer?.textSize ?? fl.textSize;
  const footerShowName = overrides.footer?.showName ?? true;
  const visSocials = socials.slice(0, MAX_SOCIALS);
  const overlay: OverlayFx = overrides.overlay ?? { type: "none", color: "#000000", opacity: 0.45 };

  // ----- fx per elemen -----
  function getFx(key: string): ElementFx {
    return overrides.fx?.[key] ?? {};
  }
  function patchFx(key: string, patch: ElementFx) {
    const cur = getFx(key);
    commit({ ...overrides, fx: { ...(overrides.fx ?? {}), [key]: { ...cur, ...patch } } });
  }
  function defaultZ(key: string): number {
    if (key.startsWith("slot-")) return DEFAULT_Z.slot;
    if (key.startsWith("item-")) return DEFAULT_Z.item;
    return DEFAULT_Z[key] ?? 10;
  }
  /** Style wrapper elemen: opacity + rotasi + layer dari fx. */
  function fxStyle(key: string): React.CSSProperties {
    const f = getFx(key);
    return {
      opacity: f.opacity ?? 1,
      zIndex: f.z ?? defaultZ(key),
      ...(f.rotation ? { transform: `rotate(${f.rotation}deg)` } : {}),
    };
  }

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
    commit({ ...overrides, delivery: { ids: next, x: cur?.x ?? 60, y: cur?.y ?? deliveryDefaultY, label: cur?.label, scale: cur?.scale } });
  }
  function toggleBadge(id: string) {
    const cur = overrides.badges;
    const ids = cur?.ids ?? [];
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    commit({ ...overrides, badges: { ids: next, x: cur?.x ?? 60, y: cur?.y ?? badgeDefaultY, scale: cur?.scale } });
  }

  function patchSlot(id: string, patch: Record<string, unknown>) {
    const cur = overrides.slots[id] ?? {};
    commit({ ...overrides, slots: { ...overrides.slots, [id]: { ...cur, ...patch } } });
  }
  function patchItem(id: string, patch: Partial<FreeItem>) {
    commit({ ...overrides, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  }
  function deleteItem(id: string) {
    commit({ ...overrides, items: items.filter((it) => it.id !== id) });
    setSelKey(slots[0] ? `slot-${slots[0].id}` : "");
  }

  // ----- tambah elemen bebas -----
  function addTextItem() {
    if (items.length >= MAX_ITEMS) { window.alert(`Maksimal ${MAX_ITEMS} elemen tambahan.`); return; }
    const id = `t${Date.now().toString(36)}`;
    const w = 600, h = 120;
    const item: FreeItem = {
      id, kind: "text",
      x: Math.round((layout.canvas.width - w) / 2), y: Math.round((layout.canvas.height - h) / 2),
      w, h, text: "Teks baru", fontFamily: "Inter", fontSize: 64, fontWeight: 800, color: "#ffffff",
    };
    commit({ ...overrides, items: [...items, item] });
    setSelKey(`item-${id}`);
  }
  function addImageItem(file: File) {
    if (items.length >= MAX_ITEMS) { window.alert(`Maksimal ${MAX_ITEMS} elemen tambahan.`); return; }
    if (file.size > 2 * 1024 * 1024) { window.alert("Gambar terlalu besar (maks 2MB). Kecilkan dulu ya."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : null;
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        const w = 400;
        const h = Math.max(40, Math.round((w * img.naturalHeight) / Math.max(1, img.naturalWidth)));
        const id = `g${Date.now().toString(36)}`;
        const item: FreeItem = {
          id, kind: "image", src,
          x: Math.round((layout.canvas.width - w) / 2), y: Math.round((layout.canvas.height - h) / 2), w, h,
        };
        commit({ ...overrides, items: [...items, item] });
        setSelKey(`item-${id}`);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function commitPosition(kind: DragKind, id: string | undefined, x: number, y: number) {
    if (kind === "slot" && id) {
      const s = slots.find((x2) => x2.id === id)!;
      patchSlotRaw(id, { box: { x, y, width: s.box.width, height: s.box.height } });
    } else if (kind === "item" && id) {
      onOverridesChange({ ...overrides, items: items.map((it) => (it.id === id ? { ...it, x, y } : it)) });
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
  // Versi tanpa riwayat (riwayat drag/resize sudah dipush di awal gestur).
  function patchSlotRaw(id: string, patch: Record<string, unknown>) {
    const cur = overrides.slots[id] ?? {};
    onOverridesChange({ ...overrides, slots: { ...overrides.slots, [id]: { ...cur, ...patch } } });
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
    // ----- resize aktif? -----
    const r = resizeRef.current;
    if (r) {
      const dW = (e.clientX - r.startClientX) / scale;
      const dH = (e.clientY - r.startClientY) / scale;
      if (r.key === "logo") {
        const size = Math.max(40, Math.round(r.startSize + Math.max(dW, dH)));
        onOverridesChange({ ...overrides, logo: { ...layout.logo, ...(overrides.logo ?? {}), size } });
      } else if (r.key.startsWith("slot-")) {
        const id = r.key.slice(5);
        const s = slots.find((x) => x.id === id);
        if (s) {
          // Batas MAKSIMAL ditambahkan (sebelumnya cuma ada batas minimal) —
          // tanpa ini, resize gampang bikin box lebih lebar dari kanvas sendiri
          // (terutama di HP: gerakan jari kecil jadi delta besar karena scale kecil).
          const width = Math.max(60, Math.min(layout.canvas.width - s.box.x, Math.round(r.startW + dW)));
          const height = Math.max(40, Math.min(layout.canvas.height - s.box.y, Math.round(r.startH + dH)));
          patchSlotRaw(id, { box: { x: s.box.x, y: s.box.y, width, height } });
        }
      } else if (r.key.startsWith("item-")) {
        const id = r.key.slice(5);
        const it = items.find((x) => x.id === id);
        if (it) {
          const maxW = Math.max(60, layout.canvas.width - it.x);
          const w = Math.max(60, Math.min(maxW, Math.round(r.startW + dW)));
          const h = it.kind === "image"
            ? Math.max(40, Math.round((w * r.startH) / Math.max(1, r.startW))) // gambar: proporsional
            : Math.max(40, Math.min(Math.max(40, layout.canvas.height - it.y), Math.round(r.startH + dH)));
          const patch: Partial<FreeItem> = { w, h };
          if (it.kind === "text") patch.fontSize = Math.max(12, Math.round(r.startFont * (w / Math.max(1, r.startW))));
          onOverridesChange({ ...overrides, items: items.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
        }
      }
      return;
    }

    const d = dragRef.current; if (!d) return;
    if (!d.active) {
      const moved = Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY);
      if (moved < DRAG_THRESHOLD_PX) return;
      d.active = true;
      pushHist(); // 1 langkah undo per gestur geser
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
    if (resizeRef.current) {
      resizeRef.current = null;
      try { stageRef.current!.releasePointerCapture(e.pointerId); } catch { /* ok */ }
      return;
    }
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

  // ----- resize handle -----
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!selKey) return;
    pushHist(); // 1 langkah undo per gestur resize
    let startW = 0, startH = 0, startSize = 0, startFont = 0;
    if (selKey === "logo") { startSize = lg.size; }
    else if (selSlot) { startW = selSlot.box.width; startH = selSlot.box.height; }
    else if (selItem) { startW = selItem.w; startH = selItem.h; startFont = selItem.fontSize ?? 64; }
    else return;
    resizeRef.current = { key: selKey, startClientX: e.clientX, startClientY: e.clientY, startW, startH, startSize, startFont };
    stageRef.current!.setPointerCapture(e.pointerId);
  }

  // ----- nudge keyboard + undo/redo -----
  function onKeyDown(e: React.KeyboardEvent) {
    if (editingKey) return; // sedang mengetik di kanvas — biarkan keyboard untuk teks
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
    const step = e.shiftKey ? 10 : 2;
    let dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    if (selSlot) {
      patchSlot(selSlot.id, { box: { x: selSlot.box.x + dx, y: selSlot.box.y + dy, width: selSlot.box.width, height: selSlot.box.height } });
    } else if (selItem) {
      patchItem(selItem.id, { x: selItem.x + dx, y: selItem.y + dy });
    }
  }

  // ----- kotak seleksi (semua jenis elemen) -----
  let selBox: { x: number; y: number; w: number; h: number } | null = null;
  let canResize = false;
  if (selSlot) { selBox = { x: selSlot.box.x*scale, y: selSlot.box.y*scale, w: selSlot.box.width*scale, h: selSlot.box.height*scale }; canResize = true; }
  else if (selItem) { selBox = { x: selItem.x*scale, y: selItem.y*scale, w: selItem.w*scale, h: selItem.h*scale }; canResize = true; }
  else if (selKey === "logo" && logoUrl) { selBox = { x: lg.x*scale, y: lg.y*scale, w: lg.size*scale, h: lg.size*scale }; canResize = true; }
  else if (selKey === "badges" && badgeItems.length > 0) selBox = { x: badgesX*scale, y: badgesY*scale, w: badgesW*scale, h: BADGE_H*scale };
  else if (selKey === "delivery" && deliveryIds.length > 0) selBox = { x: deliveryX*scale, y: deliveryY*scale, w: Math.max(deliveryW,200)*scale, h: deliveryH*scale };
  else if (selKey === "footer" && (visSocials.length > 0 || businessName)) {
    const fw = 300, fh = isColumn ? visSocials.length*(footerIconSize+10) : footerIconSize;
    selBox = { x: (overrides.footer?.x ?? fl.x)*scale, y: (overrides.footer?.y ?? fl.y)*scale, w: fw*scale, h: fh*scale };
  }

  const selFx = selKey ? getFx(selKey) : {};
  const selLabel =
    selSlot ? (selSlot.label ?? selSlot.id)
    : selItem ? (selItem.kind === "text" ? "Teks tambahan" : "Gambar tambahan")
    : selKey === "logo" ? "Logo" : selKey === "footer" ? "Sosmed" : selKey === "delivery" ? "Pesan-antar"
    : selKey === "badges" ? "Sertifikasi" : "";

  const IMG_STYLE: React.CSSProperties = { pointerEvents: "none", userSelect: "none" };
  const histState = histRef.current;

  return (
    <div>
      {/* toolbar: undo/redo + tambah elemen */}
      <div className="mx-auto mb-2 flex flex-wrap items-center gap-2" style={{ width: displayW }}>
        <button type="button" onClick={undo} disabled={histState.past.length === 0} title="Undo (Ctrl+Z)"
          className="rounded-lg border border-navy/15 px-2.5 py-1 text-sm font-bold text-navy disabled:opacity-30">↶</button>
        <button type="button" onClick={redo} disabled={histState.future.length === 0} title="Redo (Ctrl+Shift+Z)"
          className="rounded-lg border border-navy/15 px-2.5 py-1 text-sm font-bold text-navy disabled:opacity-30">↷</button>
        <span className="mx-1 h-5 w-px bg-navy/10" />
        <button type="button" onClick={addTextItem}
          className="rounded-lg border border-primary px-2.5 py-1 text-xs font-semibold text-primary">+ Teks</button>
        <button type="button" onClick={()=>fileRef.current?.click()}
          className="rounded-lg border border-primary px-2.5 py-1 text-xs font-semibold text-primary">+ Gambar</button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e)=>{ const f = e.target.files?.[0]; if (f) addImageItem(f); e.target.value = ""; }} />
      </div>

      <div className="mx-auto" style={{ width: displayW }}>
        <div ref={(el) => { stageRef.current = el; (exportRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown} tabIndex={0}
          style={{ position:"relative", width:displayW, height:displayH, borderRadius:0, overflow:"hidden", background:"#111", touchAction:"none", outline:"none" }}>

          {backDecos.map((d, i) => <DecoView key={"b"+i} d={d} scale={scale} />)}

          {/* Zoom overscan ~4% — sama seperti renderTemplate.tsx (Satori):
              nutupin tepi/sudut cacat dari AI (mis. lekukan/vignette) yang
              kadang lolos dari instruksi prompt. Tanpa ini, DomEditor tidak
              sinkron dengan hasil server-render. */}
          {photo && <img src={photo} alt="" crossOrigin="anonymous" draggable={false}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", transform:"scale(1.04)", transformOrigin:"center", ...IMG_STYLE }} />}

          {/* overlay warna/gradient di atas foto — ikut terekspor */}
          {overlay.type !== "none" && (
            <div style={{ position:"absolute", inset:0, zIndex:OVERLAY_Z, pointerEvents:"none",
              ...(overlay.type === "solid"
                ? { backgroundColor: hexToRgba(overlay.color, overlay.opacity) }
                : overlay.type === "bottom"
                ? { backgroundImage: `linear-gradient(to top, ${hexToRgba(overlay.color, overlay.opacity)} 0%, ${hexToRgba(overlay.color, 0)} 60%)` }
                : { backgroundImage: `linear-gradient(to bottom, ${hexToRgba(overlay.color, overlay.opacity)} 0%, ${hexToRgba(overlay.color, 0)} 60%)` }) }} />
          )}

          {frontDecos.map((d, i) => <DecoView key={"f"+i} d={d} scale={scale} z={FRONT_DECO_Z} />)}

          {/* teks */}
          {slots.map((slot) => {
            const value = values[slot.id] ?? slot.placeholder ?? "";
            const fitted = fitFontSize(value, { boxWidth:slot.box.width, boxHeight:slot.box.height, maxFontSize:slot.maxFontSize, minFontSize:slot.minFontSize, lineHeight:1 });
            const justify = slot.align === "left" ? "flex-start" : slot.align === "right" ? "flex-end" : "center";
            return (
              <div key={slot.id} ref={registerElem(`slot-${slot.id}`)}
                onPointerDown={(e)=>{
                  const k = `slot-${slot.id}`;
                  setSelKey(k);
                  const now = Date.now();
                  if (tapRef.current.key === k && now - tapRef.current.t < 350) {
                    tapRef.current = { key: "", t: 0 };
                    dragRef.current = null;
                    setEditingKey(k); // tap kedua = mulai ketik
                    return;
                  }
                  tapRef.current = { key: k, t: now };
                  stageRef.current?.focus();
                  startDrag(e,"slot",slot.box.x,slot.box.y,k,slot.box.width,slot.box.height,slot.id);
                }}
                style={{ position:"absolute", left:slot.box.x*scale, top:slot.box.y*scale, width:slot.box.width*scale, height:slot.box.height*scale,
                  display:"flex", alignItems:"flex-start", justifyContent:justify, cursor:"grab", ...fxStyle(`slot-${slot.id}`) }}>
                {editingKey === `slot-${slot.id}` ? (
                  <div ref={editRef} contentEditable suppressContentEditableWarning
                    onPointerDown={(e)=>e.stopPropagation()}
                    onBlur={(e)=>{ onTextChange?.(slot.id, (e.target as HTMLDivElement).innerText); setEditingKey(null); }}
                    onKeyDown={(e)=>{ e.stopPropagation(); if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") { e.preventDefault(); (e.target as HTMLDivElement).blur(); } }}
                    style={{ fontFamily:`"${slot.fontFamily}"`, fontSize:fitted*scale, fontWeight:slot.fontWeight ?? 400,
                      color:slot.color, textAlign:slot.align, lineHeight:1, textShadow:buildTextShadow(slot,scale), whiteSpace:"pre-wrap",
                      outline:"none", cursor:"text", minWidth:20 }}>{value}</div>
                ) : (
                  <div style={{ fontFamily:`"${slot.fontFamily}"`, fontSize:fitted*scale, fontWeight:slot.fontWeight ?? 400,
                    color:slot.color, textAlign:slot.align, lineHeight:1, textShadow:buildTextShadow(slot,scale), whiteSpace:"pre-wrap", userSelect:"none" }}>{value}</div>
                )}
              </div>
            );
          })}

          {/* elemen bebas (teks/gambar tambahan) */}
          {items.map((it) => (
            <div key={it.id} ref={registerElem(`item-${it.id}`)}
              onPointerDown={(e)=>{
                const k = `item-${it.id}`;
                setSelKey(k);
                const now = Date.now();
                if (it.kind === "text" && tapRef.current.key === k && now - tapRef.current.t < 350) {
                  tapRef.current = { key: "", t: 0 };
                  dragRef.current = null;
                  setEditingKey(k); // tap kedua = mulai ketik
                  return;
                }
                tapRef.current = { key: k, t: now };
                stageRef.current?.focus();
                startDrag(e,"item",it.x,it.y,k,it.w,it.h,it.id);
              }}
              style={{ position:"absolute", left:it.x*scale, top:it.y*scale, width:it.w*scale, height:it.h*scale, cursor:"grab", ...fxStyle(`item-${it.id}`) }}>
              {it.kind === "text" ? (
                editingKey === `item-${it.id}` ? (
                  <div ref={editRef} contentEditable suppressContentEditableWarning
                    onPointerDown={(e)=>e.stopPropagation()}
                    onBlur={(e)=>{ patchItem(it.id, { text: (e.target as HTMLDivElement).innerText }); setEditingKey(null); }}
                    onKeyDown={(e)=>{ e.stopPropagation(); if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") { e.preventDefault(); (e.target as HTMLDivElement).blur(); } }}
                    style={{ fontFamily:`"${it.fontFamily ?? "Inter"}"`, fontSize:(it.fontSize ?? 64)*scale, fontWeight:it.fontWeight ?? 800,
                      color:it.color ?? "#ffffff", lineHeight:1.1, whiteSpace:"pre-wrap", textAlign:it.align ?? "left", width:"100%",
                      textShadow: buildTextShadow(it, scale),
                      outline:"none", cursor:"text", minWidth:20 }}>{it.text ?? ""}</div>
                ) : (
                  <div style={{ fontFamily:`"${it.fontFamily ?? "Inter"}"`, fontSize:(it.fontSize ?? 64)*scale, fontWeight:it.fontWeight ?? 800,
                    color:it.color ?? "#ffffff", lineHeight:1.1, whiteSpace:"pre-wrap", textAlign:it.align ?? "left", width:"100%",
                    textShadow: buildTextShadow(it, scale), userSelect:"none" }}>{it.text ?? ""}</div>
                )
              ) : (
                <img src={it.src} alt="" draggable={false}
                  style={{ width:"100%", height:"100%", objectFit:"contain", ...IMG_STYLE }} />
              )}
            </div>
          ))}

          {/* badge sertifikasi */}
          {badgeItems.length > 0 && (
            <div ref={registerElem("badges")}
              onPointerDown={(e)=>{ setSelKey("badges"); startDrag(e,"badges",badgesX,badgesY,"badges",badgesW,BADGE_H); }}
              style={{ position:"absolute", left:badgesX*scale, top:badgesY*scale, width:badgesW*scale, height:BADGE_H*scale, cursor:"grab", ...fxStyle("badges") }}>
              {badgeItems.map((it) => (
                <img key={it.id} src={`/badges/${it.id}.png`} alt="" crossOrigin="anonymous" draggable={false}
                  style={{ position:"absolute", left:it.offsetX*scale, top:0, width:it.w*scale, height:BADGE_H*scale, objectFit:"contain", ...IMG_STYLE }} />
              ))}
            </div>
          )}

          {/* badge pesan-antar */}
          {deliveryIds.length > 0 && (
            <div ref={registerElem("delivery")}
              onPointerDown={(e)=>{ setSelKey("delivery"); startDrag(e,"delivery",deliveryX,deliveryY,"delivery",Math.max(deliveryW, 200),deliveryH); }}
              style={{ position:"absolute", left:deliveryX*scale, top:deliveryY*scale, cursor:"grab", ...fxStyle("delivery") }}>
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
              onPointerDown={(e)=>{ setSelKey("footer"); startDrag(e,"footer",overrides.footer?.x ?? fl.x, overrides.footer?.y ?? fl.y,"footer",300,isColumn?visSocials.length*(footerIconSize+10):footerIconSize); }}
              style={{ position:"absolute", left:(overrides.footer?.x ?? fl.x)*scale, top:(overrides.footer?.y ?? fl.y)*scale, cursor:"grab", ...fxStyle("footer") }}>
              {businessName && footerShowName && (
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
                setSelKey("logo");
                const now = Date.now();
                if (now - logoTapRef.current < 320) {
                  logoTapRef.current = 0;
                  if (canToggleLogo) onLogoVariantChange?.(logoVariant==="light"?"dark":"light");
                  return; // dobel-tap = ganti varian, jangan mulai drag
                }
                logoTapRef.current = now;
                startDrag(e,"logo",lg.x,lg.y,"logo",lg.size,lg.size);
              }}
              style={{ position:"absolute", left:lg.x*scale, top:lg.y*scale, width:lg.size*scale, height:lg.size*scale, cursor:"grab", ...fxStyle("logo") }}>
              <img src={logoUrl} alt="" crossOrigin="anonymous" draggable={false}
                style={{ width:"100%", height:"100%", objectFit:"contain", ...IMG_STYLE }} />
            </div>
          )}

          {/* garis bantu snap — data-noexport, dikontrol via ref (tanpa re-render) */}
          <div ref={guideVRef} data-noexport="1" style={{ position:"absolute", left:displayW/2-0.5, top:0, width:1, height:"100%", zIndex:98,
            borderLeft:"1.5px dashed #12B3A0", opacity:0, pointerEvents:"none", transition:"opacity 80ms" }} />
          <div ref={guideHRef} data-noexport="1" style={{ position:"absolute", top:displayH/2-0.5, left:0, height:1, width:"100%", zIndex:98,
            borderTop:"1.5px dashed #12B3A0", opacity:0, pointerEvents:"none", transition:"opacity 80ms" }} />

          {/* kotak seleksi — data-noexport */}
          {selBox && (
            <div data-noexport="1" style={{ position:"absolute", left:selBox.x-3, top:selBox.y-3, width:selBox.w+6, height:selBox.h+6, zIndex:99,
              border:"1.5px dashed #12B3A0", borderRadius:4, pointerEvents:"none" }} />
          )}
          {/* handle resize — pojok kanan-bawah elemen terpilih (slot/item/logo).
              Titik terlihat tetap 16x16 (biar rapi), tapi AREA SENTUH dibikin
              40x40 (invisible) di sekelilingnya — 16px jauh di bawah standar
              target sentuh minimum (44px iOS / 48px Android), jadi di HP susah
              digrab presisi & gampang salah tarik (ikut andil di bug resize
              kebablasan sebelumnya). */}
          {selBox && canResize && (
            <div data-noexport="1" onPointerDown={startResize}
              style={{ position:"absolute", left:selBox.x+selBox.w-18, top:selBox.y+selBox.h-18, width:40, height:40, zIndex:100,
                cursor:"nwse-resize", touchAction:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:16, height:16, background:"#12B3A0", border:"2px solid #ffffff", borderRadius:4, pointerEvents:"none" }} />
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-navy/50">Seret elemen langsung — nempel otomatis ke tengah/tepi. Dobel-klik teks = ketik langsung. Kotak hijau di pojok = ubah ukuran. Panah = geser halus (Shift = cepat). Dobel-klik logo: terang/gelap.</p>
      </div>

      {/* overlay foto */}
      {photo && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-navy">Overlay foto:</span>
          {([["none","Tanpa"],["bottom","Gelap bawah"],["top","Gelap atas"],["solid","Penuh"]] as const).map(([t, label]) => (
            <button key={t} type="button"
              onClick={()=>commit({ ...overrides, overlay: { ...overlay, type: t } })}
              className={`rounded-lg border px-2.5 py-1 font-medium ${overlay.type===t?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>
              {label}
            </button>
          ))}
          {overlay.type !== "none" && (
            <>
              <input type="color" value={overlay.color}
                onChange={(e)=>commit({ ...overrides, overlay: { ...overlay, color: e.target.value } })}
                className="h-7 w-8 rounded border border-navy/15" />
              <input type="range" min={5} max={90} value={Math.round(overlay.opacity*100)} title="Kepekatan overlay"
                onChange={(e)=>commit({ ...overrides, overlay: { ...overlay, opacity: Number(e.target.value)/100 } })} />
            </>
          )}
        </div>
      )}

      {/* footer sosmed: arah + ukuran */}
      {(visSocials.length > 0 || businessName) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-navy">Sosmed:</span>
          <button type="button" onClick={()=>commit({ ...overrides, footer: { x: fl.x, y: fl.y, ...(overrides.footer ?? {}), direction: "row" } })}
            className={`rounded-lg border px-2.5 py-1 font-medium ${!isColumn?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>Mendatar</button>
          <button type="button" onClick={()=>commit({ ...overrides, footer: { x: fl.x, y: fl.y, ...(overrides.footer ?? {}), direction: "column" } })}
            className={`rounded-lg border px-2.5 py-1 font-medium ${isColumn?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>Menurun</button>
          <span className="ml-1 text-navy/50">Ukuran:</span>
          <input type="range" min={24} max={72} value={footerIconSize} title="Ukuran ikon sosmed"
            onChange={(e)=>{ const v = Number(e.target.value); commit({ ...overrides, footer: { x: fl.x, y: fl.y, ...(overrides.footer ?? {}), iconSize: v, textSize: Math.round(v*0.62) } }); }} />
          {businessName && (
            <button type="button" title="Tampilkan/sembunyikan nama bisnis di atas ikon sosmed"
              onClick={()=>commit({ ...overrides, footer: { x: fl.x, y: fl.y, ...(overrides.footer ?? {}), showName: !footerShowName } })}
              className={`rounded-lg border px-2.5 py-1 font-medium ${footerShowName?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>
              {footerShowName ? "Nama: Tampil" : "Nama: Sembunyi"}
            </button>
          )}
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
            onChange={(e)=>commit({ ...overrides, delivery: { ids: deliveryIds, x: deliveryX, y: deliveryY, label: overrides.delivery?.label, scale: Number(e.target.value)/100 } })} />
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
            onChange={(e)=>commit({ ...overrides, badges: { ids: badgeIds, x: badgesX, y: badgesY, scale: Number(e.target.value)/100 } })} />
        )}
      </div>

      {/* pemilih elemen */}
      <div className="mt-3 rounded-xl border border-navy/10 p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {slots.map((s) => (
            <button key={s.id} type="button" onClick={()=>setSelKey(`slot-${s.id}`)}
              className={`rounded-full px-3.5 py-2 sm:px-3 sm:py-1 text-xs font-semibold ${selKey===`slot-${s.id}`?"bg-primary text-white":"bg-navy/10 text-navy"}`}>
              {s.label ?? s.id}
            </button>
          ))}
          {logoUrl && (
            <button type="button" onClick={()=>setSelKey("logo")}
              className={`rounded-full px-3.5 py-2 sm:px-3 sm:py-1 text-xs font-semibold ${selKey==="logo"?"bg-primary text-white":"bg-navy/10 text-navy"}`}>Logo</button>
          )}
          {(visSocials.length > 0 || businessName) && (
            <button type="button" onClick={()=>setSelKey("footer")}
              className={`rounded-full px-3.5 py-2 sm:px-3 sm:py-1 text-xs font-semibold ${selKey==="footer"?"bg-primary text-white":"bg-navy/10 text-navy"}`}>Sosmed</button>
          )}
          {deliveryIds.length > 0 && (
            <button type="button" onClick={()=>setSelKey("delivery")}
              className={`rounded-full px-3.5 py-2 sm:px-3 sm:py-1 text-xs font-semibold ${selKey==="delivery"?"bg-primary text-white":"bg-navy/10 text-navy"}`}>Pesan-antar</button>
          )}
          {badgeItems.length > 0 && (
            <button type="button" onClick={()=>setSelKey("badges")}
              className={`rounded-full px-3.5 py-2 sm:px-3 sm:py-1 text-xs font-semibold ${selKey==="badges"?"bg-primary text-white":"bg-navy/10 text-navy"}`}>Sertifikasi</button>
          )}
          {items.map((it, i) => (
            <button key={it.id} type="button" onClick={()=>setSelKey(`item-${it.id}`)}
              className={`rounded-full px-3.5 py-2 sm:px-3 sm:py-1 text-xs font-semibold ${selKey===`item-${it.id}`?"bg-primary text-white":"bg-navy/10 text-navy"}`}>
              {it.kind === "text" ? `Teks+${i+1}` : `Gbr+${i+1}`}
            </button>
          ))}
        </div>

        {/* kontrol umum: opacity + rotasi + layer (semua elemen).
            MOBILE: satu kontrol per baris, penuh lebar, target sentuh besar.
            sm ke atas: kembali ke baris ringkas seperti versi desktop lama. */}
        {selKey && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 text-xs">
            <span className="font-semibold text-navy">{selLabel}</span>
            <SliderToggle label="Transparansi" valueLabel={`${Math.round((selFx.opacity ?? 1)*100)}%`}>
              <input type="range" min={5} max={100} value={Math.round((selFx.opacity ?? 1)*100)}
                onChange={(e)=>patchFx(selKey, { opacity: Number(e.target.value)/100 })}
                className="h-6 w-full accent-primary sm:h-auto sm:w-28" />
            </SliderToggle>
            <SliderToggle label="Rotasi" valueLabel={`${selFx.rotation ?? 0}°`}>
              <div className="flex items-center gap-2">
                <input type="range" min={-180} max={180} value={selFx.rotation ?? 0}
                  onChange={(e)=>patchFx(selKey, { rotation: Number(e.target.value) })}
                  className="h-6 w-full flex-1 accent-primary sm:h-auto sm:w-28 sm:flex-none" />
                {(selFx.rotation ?? 0) !== 0 && (
                  <button type="button" onClick={()=>patchFx(selKey, { rotation: 0 })}
                    className="shrink-0 rounded border border-navy/15 px-2.5 py-1.5 text-navy/60 sm:px-1.5 sm:py-0.5">0°</button>
                )}
              </div>
            </SliderToggle>
            <span className="flex items-center gap-2 text-navy/70">
              <span className="shrink-0">Layer</span>
              <button type="button" title="Naikkan selapis" onClick={()=>patchFx(selKey, { z: Math.min(90, (selFx.z ?? defaultZ(selKey)) + 1) })}
                className="rounded border border-navy/15 px-3.5 py-2 font-bold text-navy sm:px-2 sm:py-0.5">▲</button>
              <button type="button" title="Turunkan selapis" onClick={()=>patchFx(selKey, { z: Math.max(1, (selFx.z ?? defaultZ(selKey)) - 1) })}
                className="rounded border border-navy/15 px-3.5 py-2 font-bold text-navy sm:px-2 sm:py-0.5">▼</button>
            </span>
            {selItem && (
              <button type="button" onClick={()=>deleteItem(selItem.id)}
                className="rounded-lg border border-red-300 px-3.5 py-2 font-semibold text-red-500 sm:px-2.5 sm:py-1">Hapus</button>
            )}
          </div>
        )}

        {/* kontrol slot teks template — mobile: 1 kontrol per baris */}
        {selSlot && (
          <>
            <div className="mt-3 flex flex-col gap-2.5 sm:mt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 text-sm">
              <input type="text" value={values[selSlot.id] ?? ""} onChange={(e)=>onTextChange?.(selSlot.id, e.target.value)}
                className="w-full rounded-lg border border-navy/15 px-3 py-2.5 sm:min-w-[140px] sm:flex-1 sm:px-2 sm:py-1.5" placeholder="Teks…" />
              <div className="flex gap-2.5 sm:contents">
                <select value={selSlot.fontFamily} onChange={(e)=>patchSlot(selSlot.id, { fontFamily: e.target.value })}
                  className="flex-1 rounded-lg border border-navy/15 px-3 py-2.5 sm:flex-none sm:px-2 sm:py-1.5">
                  {FONT_OPTIONS.map((f) => <option key={f.id} value={f.family}>{f.family}</option>)}
                </select>
                <input type="color" value={/^#/.test(selSlot.color) ? selSlot.color.slice(0,7) : "#ffffff"} onChange={(e)=>patchSlot(selSlot.id, { color: e.target.value })}
                  className="h-11 w-14 shrink-0 rounded border border-navy/15 sm:h-8 sm:w-9" />
              </div>
              <SliderToggle label="Ukuran font" valueLabel={`${selSlot.maxFontSize}`}>
                <input type="range" min={12} max={140} value={selSlot.maxFontSize} title="Ukuran font"
                  onChange={(e)=>patchSlot(selSlot.id, { fontSize: Number(e.target.value) })}
                  className="h-6 w-full accent-primary sm:h-auto sm:w-28" />
              </SliderToggle>
            </div>

            <div className="mt-3 flex items-center gap-2 sm:mt-2 sm:flex-wrap text-xs">
              <span className="shrink-0 font-medium text-navy/70">Rata:</span>
              {(["left","center","right"] as const).map((a) => (
                <button key={a} type="button" onClick={()=>patchSlot(selSlot.id, { align: a })}
                  className={`flex-1 rounded-lg border px-2.5 py-2.5 font-medium sm:flex-none sm:py-1 ${selSlot.align===a?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>
                  {a === "left" ? "Kiri" : a === "center" ? "Tengah" : "Kanan"}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2.5 sm:mt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 text-xs">
              <label className="flex items-center gap-2 font-medium text-navy/70">
                <input type="checkbox" checked={!!selSlot.shadow}
                  onChange={(e)=>patchSlot(selSlot.id, { shadow: e.target.checked ? { blur: 8, color: "#000000", opacity: 0.6 } : null })}
                  className="h-5 w-5 sm:h-4 sm:w-4" />
                Shadow
              </label>
              {selSlot.shadow && (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <SliderToggle label="Blur" valueLabel={`${selSlot.shadow.blur}`}>
                    <input type="range" min={0} max={40} value={selSlot.shadow.blur} title="Blur"
                      onChange={(e)=>patchSlot(selSlot.id, { shadow: { ...selSlot.shadow!, blur: Number(e.target.value) } })}
                      className="h-6 w-full accent-primary sm:h-auto sm:w-24" />
                  </SliderToggle>
                  <input type="color" value={selSlot.shadow.color}
                    onChange={(e)=>patchSlot(selSlot.id, { shadow: { ...selSlot.shadow!, color: e.target.value } })}
                    className="h-10 w-12 shrink-0 rounded border border-navy/15 sm:h-7 sm:w-8" />
                  <SliderToggle label="Opasitas" valueLabel={`${Math.round(selSlot.shadow.opacity*100)}%`}>
                    <input type="range" min={10} max={100} value={Math.round(selSlot.shadow.opacity*100)} title="Opasitas"
                      onChange={(e)=>patchSlot(selSlot.id, { shadow: { ...selSlot.shadow!, opacity: Number(e.target.value)/100 } })}
                      className="h-6 w-full accent-primary sm:h-auto sm:w-24" />
                  </SliderToggle>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2.5 sm:mt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 text-xs">
              <label className="flex items-center gap-2 font-medium text-navy/70">
                <input type="checkbox" checked={!!(selSlot.outline && selSlot.outline.width > 0)}
                  onChange={(e)=>patchSlot(selSlot.id, { outline: e.target.checked ? { width: 3, color: "#000000" } : null })}
                  className="h-5 w-5 sm:h-4 sm:w-4" />
                Outline
              </label>
              {selSlot.outline && selSlot.outline.width > 0 && (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <SliderToggle label="Tebal" valueLabel={`${selSlot.outline.width}`}>
                    <input type="range" min={1} max={10} value={selSlot.outline.width} title="Tebal"
                      onChange={(e)=>patchSlot(selSlot.id, { outline: { ...selSlot.outline!, width: Number(e.target.value) } })}
                      className="h-6 w-full accent-primary sm:h-auto sm:w-24" />
                  </SliderToggle>
                  <input type="color" value={selSlot.outline.color}
                    onChange={(e)=>patchSlot(selSlot.id, { outline: { ...selSlot.outline!, color: e.target.value } })}
                    className="h-10 w-12 shrink-0 rounded border border-navy/15 sm:h-7 sm:w-8" />
                </div>
              )}
            </div>
          </>
        )}

        {/* kontrol teks tambahan — mobile: 1 kontrol per baris */}
        {selItem && selItem.kind === "text" && (
          <>
            <div className="mt-3 flex flex-col gap-2.5 sm:mt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 text-sm">
              <input type="text" value={selItem.text ?? ""} onChange={(e)=>patchItem(selItem.id, { text: e.target.value })}
                className="w-full rounded-lg border border-navy/15 px-3 py-2.5 sm:min-w-[140px] sm:flex-1 sm:px-2 sm:py-1.5" placeholder="Teks…" />
              <div className="flex gap-2.5 sm:contents">
                <select value={selItem.fontFamily ?? "Inter"} onChange={(e)=>patchItem(selItem.id, { fontFamily: e.target.value })}
                  className="flex-1 rounded-lg border border-navy/15 px-3 py-2.5 sm:flex-none sm:px-2 sm:py-1.5">
                  {FONT_OPTIONS.map((f) => <option key={f.id} value={f.family}>{f.family}</option>)}
                </select>
                <input type="color" value={selItem.color ?? "#ffffff"} onChange={(e)=>patchItem(selItem.id, { color: e.target.value })}
                  className="h-11 w-14 shrink-0 rounded border border-navy/15 sm:h-8 sm:w-9" />
              </div>
              <SliderToggle label="Ukuran font" valueLabel={`${selItem.fontSize ?? 64}`}>
                <input type="range" min={12} max={160} value={selItem.fontSize ?? 64} title="Ukuran font"
                  onChange={(e)=>patchItem(selItem.id, { fontSize: Number(e.target.value) })}
                  className="h-6 w-full accent-primary sm:h-auto sm:w-28" />
              </SliderToggle>
              <div className="flex items-center gap-2 text-xs">
                <span className="shrink-0 font-medium text-navy/70">Rata:</span>
                {(["left","center","right"] as const).map((a) => (
                  <button key={a} type="button" onClick={()=>patchItem(selItem.id, { align: a })}
                    className={`flex-1 rounded-lg border px-2.5 py-2.5 font-medium sm:flex-none sm:py-1 ${(selItem.align ?? "left")===a?"border-primary bg-primary/10 text-primary":"border-navy/15 text-navy/70"}`}>
                    {a === "left" ? "Kiri" : a === "center" ? "Tengah" : "Kanan"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2.5 sm:mt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 text-xs">
              <label className="flex items-center gap-2 font-medium text-navy/70">
                <input type="checkbox" checked={!!selItem.shadow}
                  onChange={(e)=>patchItem(selItem.id, { shadow: e.target.checked ? { blur: 8, color: "#000000", opacity: 0.6 } : null })}
                  className="h-5 w-5 sm:h-4 sm:w-4" />
                Shadow
              </label>
              {selItem.shadow && (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <SliderToggle label="Blur" valueLabel={`${selItem.shadow.blur}`}>
                    <input type="range" min={0} max={40} value={selItem.shadow.blur} title="Blur"
                      onChange={(e)=>patchItem(selItem.id, { shadow: { ...selItem.shadow!, blur: Number(e.target.value) } })}
                      className="h-6 w-full accent-primary sm:h-auto sm:w-24" />
                  </SliderToggle>
                  <input type="color" value={selItem.shadow.color}
                    onChange={(e)=>patchItem(selItem.id, { shadow: { ...selItem.shadow!, color: e.target.value } })}
                    className="h-10 w-12 shrink-0 rounded border border-navy/15 sm:h-7 sm:w-8" />
                  <SliderToggle label="Opasitas" valueLabel={`${Math.round(selItem.shadow.opacity*100)}%`}>
                    <input type="range" min={10} max={100} value={Math.round(selItem.shadow.opacity*100)} title="Opasitas"
                      onChange={(e)=>patchItem(selItem.id, { shadow: { ...selItem.shadow!, opacity: Number(e.target.value)/100 } })}
                      className="h-6 w-full accent-primary sm:h-auto sm:w-24" />
                  </SliderToggle>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2.5 sm:mt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 text-xs">
              <label className="flex items-center gap-2 font-medium text-navy/70">
                <input type="checkbox" checked={!!(selItem.outline && selItem.outline.width > 0)}
                  onChange={(e)=>patchItem(selItem.id, { outline: e.target.checked ? { width: 3, color: "#000000" } : null })}
                  className="h-5 w-5 sm:h-4 sm:w-4" />
                Outline
              </label>
              {selItem.outline && selItem.outline.width > 0 && (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <SliderToggle label="Tebal" valueLabel={`${selItem.outline.width}`}>
                    <input type="range" min={1} max={10} value={selItem.outline.width} title="Tebal"
                      onChange={(e)=>patchItem(selItem.id, { outline: { ...selItem.outline!, width: Number(e.target.value) } })}
                      className="h-6 w-full accent-primary sm:h-auto sm:w-24" />
                  </SliderToggle>
                  <input type="color" value={selItem.outline.color}
                    onChange={(e)=>patchItem(selItem.id, { outline: { ...selItem.outline!, color: e.target.value } })}
                    className="h-10 w-12 shrink-0 rounded border border-navy/15 sm:h-7 sm:w-8" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

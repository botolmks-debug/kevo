"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Text as KonvaText, Image as KonvaImage, Group, Rect, Line as KonvaLine } from "react-konva";
import { HelpTip } from "@/components/ui/HelpTip";
import type Konva from "konva";
import { FONT_OPTIONS } from "@/lib/templates/fonts";
import type { ImageSlot, TemplateLayout, TextSlot } from "@/lib/templates/types";
import type { EditorOverrides, TextSlotOverride, FooterOverride } from "@/lib/editor/layoutOverrides";
import { DELIVERY_PLATFORMS, DELIVERY_MAP } from "@/lib/social/delivery";
import { useKonvaImage } from "./useKonvaImage";
import { fitFontSize } from "@/lib/render/fitText";

const PREVIEW_WIDTH = 340;
const ALIGN_LABEL: Record<"left" | "center" | "right", string> = {
  left: "Kiri", center: "Tengah", right: "Kanan",
};
const SOCIAL_COLORS: Record<string, string> = {
  instagram: "#E1306C", whatsapp: "#25D366", facebook: "#1877F2", tiktok: "#111111",
  youtube: "#FF0000", x: "#111111", line: "#06C755", telegram: "#0088CC",
  threads: "#111111", linkedin: "#0A66C2", wechat: "#07C160", shopee: "#EE4D2D",
  xiaohongshu: "#FF2442", kakaotalk: "#FFE812", zalo: "#0068FF",
  tokopedia: "#42B549", lazada: "#1A0E4E", website: "#0FB6A6",
};

type EditingBox = { x: number; y: number; width: number; height: number };
type SocialItem = { platformId: string; value: string };

type CanvasEditorProps = {
  layout: TemplateLayout;
  values: Record<string, string>;
  overrides: EditorOverrides;
  onOverridesChange: (overrides: EditorOverrides) => void;
  onTextChange: (slotId: string, value: string) => void;
  footerPreviewText?: string;
  socials?: SocialItem[];
  businessName?: string;
  logoUrl?: string | null;
  /** Versi logo yang sedang tampil ("light" default / "dark"). */
  logoVariant?: "dark" | "light";
  /** true kalau kedua versi logo (terang & gelap) tersedia untuk ditukar. */
  canToggleLogo?: boolean;
  onLogoVariantChange?: (variant: "dark" | "light") => void;
  /** WYSIWYG: URL render Satori asli sebagai latar; semua elemen jadi transparan (opt-in, hanya di Edit). */
  ghostUrl?: string;
};

function SocialIconKonva({ platformId, size, scale }: { platformId: string; size: number; scale: number }) {
  const img = useKonvaImage(`/icons/${platformId}.png`);
  const px = size * scale;
  if (img) return <KonvaImage image={img} width={px} height={px} listening={false} />;
  return (
    <Group listening={false}>
      <Rect width={px} height={px} fill={SOCIAL_COLORS[platformId] ?? "#64748b"} cornerRadius={px * 0.28} />
      <KonvaText text={(platformId[0] ?? "?").toUpperCase()} x={0} y={0} width={px} height={px}
        align="center" verticalAlign="middle" fontSize={px * 0.5} fontStyle="bold" fill="#fff" listening={false} />
    </Group>
  );
}

function FooterSocialItem({ platformId, value, offsetX, offsetY, iconSize, textSize, textColor, scale, isColumn }:
  { platformId: string; value: string; offsetX: number; offsetY: number; iconSize: number; textSize: number; textColor: string; scale: number; isColumn: boolean }) {
  return (
    <Group x={isColumn ? 0 : offsetX * scale} y={isColumn ? offsetY * scale : 0} listening={false}>
      <SocialIconKonva platformId={platformId} size={iconSize} scale={scale} />
      <KonvaText text={value} x={(iconSize + 10) * scale} y={iconSize * 0.18 * scale}
        fontSize={textSize * scale} fontStyle="bold" fill={textColor} listening={false} />
    </Group>
  );
}

function DeliveryChipKonva({ id, w, h, scale }: { id: string; w: number; h: number; scale: number }) {
  const img = useKonvaImage(`/delivery/${id}.png`);
  const pw = w * scale;
  const ph = h * scale;
  if (img) return <KonvaImage image={img} width={pw} height={ph} listening={false} />;
  // Fallback (gambar belum termuat): kartu putih + label warna brand.
  const p = DELIVERY_MAP[id];
  return (
    <Group listening={false}>
      <Rect width={pw} height={ph} fill="#ffffff" cornerRadius={ph * 0.18} />
      <KonvaText text={p?.label ?? id} width={pw} height={ph} align="center" verticalAlign="middle"
        fontSize={ph * 0.22} fontStyle="bold" fill={p?.color ?? "#333"} listening={false} />
    </Group>
  );
}

function LogoKonva({ url, size, scale }: { url: string; size: number; scale: number }) {
  const img = useKonvaImage(url);
  if (!img || !img.naturalWidth) return null;
  const boxPx = size * scale;
  const fit = Math.min(boxPx / img.naturalWidth, boxPx / img.naturalHeight);
  const drawW = img.naturalWidth * fit;
  const drawH = img.naturalHeight * fit;
  return (
    <KonvaImage image={img}
      x={(boxPx - drawW) / 2} y={(boxPx - drawH) / 2}
      width={drawW} height={drawH} opacity={0.9} listening={false} />
  );
}

export function CanvasEditor({
  layout, values, overrides, onOverridesChange, onTextChange,
  footerPreviewText, socials, businessName, logoUrl,
  logoVariant = "light", canToggleLogo = false, onLogoVariantChange, ghostUrl,
}: CanvasEditorProps) {
  // Lebar preview mengikuti lebar container (maks 340) supaya muat di HP.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_WIDTH);
  const [dragging, setDragging] = useState(false); // WYSIWYG: tampilkan elemen saat diseret
  useEffect(() => {
    function measure() {
      const w = wrapRef.current?.clientWidth ?? PREVIEW_WIDTH;
      setPreviewWidth(Math.max(200, Math.min(PREVIEW_WIDTH, w)));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const scale = previewWidth / layout.canvas.width;
  const previewHeight = Math.round(layout.canvas.height * scale);
  // Batasi drag: SELURUH badan elemen (bukan cuma titik pegang) tetap di dalam
  // kanvas. Ukuran tiap elemen diukur dari getClientRect, jadi logo/teks/sosmed
  // berhenti PAS di tiap tepi — tak lagi mentok sebelum tepi kiri atau kelewat
  // (terpotong) di tepi kanan/bawah. `this` = node Konva yang sedang di-drag.
  function clampDrag(this: Konva.Node, pos: { x: number; y: number }) {
    const box = this.getClientRect();          // ukuran & posisi badan (absolut)
    const abs = this.absolutePosition();        // posisi origin node saat ini
    const offX = box.x - abs.x;                 // selisih origin → tepi kiri badan
    const offY = box.y - abs.y;
    const minX = -offX;                         // tepi kiri badan mentok 0
    const maxX = previewWidth - box.width - offX;   // tepi kanan mentok kanvas
    const minY = -offY;
    const maxY = previewHeight - box.height - offY;
    return {
      x: Math.max(minX, Math.min(pos.x, Math.max(minX, maxX))),
      y: Math.max(minY, Math.min(pos.y, Math.max(minY, maxY))),
    };
  }
  // Khusus LOGO: boleh keluar kanvas MAKSIMAL setengah badannya (biar bisa
  // "nempel" di pinggir/pojok). Caranya jaga TITIK TENGAH logo tetap di dalam
  // kanvas — kalau tengah pas di tepi, berarti tepat separuh yang keluar.
  function clampLogoDrag(this: Konva.Node, pos: { x: number; y: number }) {
    const box = this.getClientRect();
    const abs = this.absolutePosition();
    const offX = box.x - abs.x;
    const offY = box.y - abs.y;
    const minX = -offX - box.width / 2;
    const maxX = previewWidth - offX - box.width / 2;
    const minY = -offY - box.height / 2;
    const maxY = previewHeight - offY - box.height / 2;
    return {
      x: Math.max(minX, Math.min(pos.x, maxX)),
      y: Math.max(minY, Math.min(pos.y, maxY)),
    };
  }

  // ── Garis panduan (smart guides) — HANYA visual di editor, tidak pernah
  // ikut disimpan: guide cuma state React lokal yang dipakai buat gambar
  // <Line> di preview Konva. Simpan PNG lewat jalur Satori yang sama sekali
  // terpisah (baca overrides x/y saja) → guide otomatis tidak ikut tersimpan.
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const SNAP_THRESHOLD = 6;

  function bestSnap(candidates: number[], targets: number[]): { delta: number; hit: number | null } {
    let best: { diff: number; delta: number; hit: number } | null = null;
    for (const c of candidates) {
      for (const t of targets) {
        const diff = Math.abs(c - t);
        if (diff <= SNAP_THRESHOLD && (!best || diff < best.diff)) best = { diff, delta: t - c, hit: t };
      }
    }
    return best ? { delta: best.delta, hit: best.hit } : { delta: 0, hit: null };
  }

  // Dipasang di onDragMove SEMUA elemen (teks, logo, footer, delivery) —
  // magnet ke tengah & tepi kanvas begitu jaraknya dekat.
  function handleSnapDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const stage = node.getStage();
    if (!stage) return;
    const rect = node.getClientRect({ relativeTo: stage });
    const targetsX = [0, previewWidth / 2, previewWidth];
    const targetsY = [0, previewHeight / 2, previewHeight];
    const candidatesX = [rect.x, rect.x + rect.width / 2, rect.x + rect.width];
    const candidatesY = [rect.y, rect.y + rect.height / 2, rect.y + rect.height];
    const snapX = bestSnap(candidatesX, targetsX);
    const snapY = bestSnap(candidatesY, targetsY);
    if (snapX.delta !== 0) node.x(node.x() + snapX.delta);
    if (snapY.delta !== 0) node.y(node.y() + snapY.delta);
    setGuides({ v: snapX.hit !== null ? [snapX.hit] : [], h: snapY.hit !== null ? [snapY.hit] : [] });
  }

  function clearGuides() {
    setGuides({ v: [], h: [] });
  }

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingBox, setEditingBox] = useState<EditingBox | null>(null);

  const textSlots = layout.slots.filter((s): s is TextSlot => s.type === "text");
  const imageSlots = layout.slots.filter((s): s is ImageSlot => s.type === "image");
  const logoImg = useKonvaImage(logoUrl ?? undefined);

  function effectiveText(slot: TextSlot) {
    const o = overrides.slots[slot.id];
    return {
      box: o?.box ?? slot.box,
      fontFamily: o?.fontFamily ?? slot.fontFamily,
      fontWeight: o?.fontWeight ?? slot.fontWeight ?? 400,
      fontSize:
        o?.fontSize ??
        fitFontSize(values[slot.id] || slot.placeholder || "", {
          boxWidth: (o?.box ?? slot.box).width,
          boxHeight: (o?.box ?? slot.box).height,
          maxFontSize: slot.maxFontSize,
          minFontSize: slot.minFontSize ?? Math.round(slot.maxFontSize * 0.5),
          lineHeight: 1,
        }),
      color: o?.color ?? slot.color,
      align: o?.align ?? slot.align,
      shadow: o?.shadow ?? null,
      outline: o?.outline ?? null,
    };
  }

  function updateSlot(slotId: string, patch: Partial<TextSlotOverride>) {
    onOverridesChange({ ...overrides, slots: { ...overrides.slots, [slotId]: { ...overrides.slots[slotId], ...patch } } });
  }

  function updateSlotBox(slotId: string, xS: number, yS: number, w: number, h: number) {
    updateSlot(slotId, { box: { x: xS / scale, y: yS / scale, width: w, height: h } });
  }

  const logoPos = overrides.logo ?? { x: layout.logo.x, y: layout.logo.y, size: layout.logo.size };
  function updateLogo(p: Partial<typeof logoPos>) { onOverridesChange({ ...overrides, logo: { ...logoPos, ...p } }); }
  function toggleLogoVariant() {
    if (!canToggleLogo || !onLogoVariantChange) return;
    onLogoVariantChange(logoVariant === "dark" ? "light" : "dark");
  }

  function openEdit(slotId: string, node: Konva.Text) {
    const stage = node.getStage(); if (!stage) return;
    const r = node.getClientRect({ relativeTo: stage });
    setEditingSlotId(slotId);
    setEditingBox({ x: r.x, y: r.y, width: Math.max(r.width, 120), height: Math.max(r.height, 36) });
  }

  function commitEdit(value: string) {
    if (editingSlotId) onTextChange(editingSlotId, value);
    setEditingSlotId(null); setEditingBox(null);
  }

  const fl = layout.footerLayout;
  const footerDir = overrides.footer?.direction ?? fl.direction ?? "row";
  const footerIconSize = overrides.footer?.iconSize ?? fl.iconSize;
  const footerTextSize = overrides.footer?.textSize ?? fl.textSize;
  const footerGap = overrides.footer?.gap ?? fl.gap;
  const isColumn = footerDir === "column";
  const footerX = (overrides.footer?.x ?? fl.x) * scale;
  const footerY = (overrides.footer?.y ?? fl.y) * scale;

  function updateFooter(p: Partial<FooterOverride>) {
    onOverridesChange({
      ...overrides,
      footer: {
        x: overrides.footer?.x ?? fl.x,
        y: overrides.footer?.y ?? fl.y,
        direction: footerDir,
        iconSize: footerIconSize,
        textSize: footerTextSize,
        ...overrides.footer,
        ...p,
      },
    });
  }

  const footerSocials = (socials ?? []).slice(0, 3);
  let cursorRow = 0; let cursorCol = 0;
  const socialItems = footerSocials.map((s) => {
    const textW = s.value.length * footerTextSize * 0.62;
    const itemW = footerIconSize + 10 + textW + footerGap;
    const item = { ...s, offsetX: cursorRow, offsetY: cursorCol };
    cursorRow += itemW; cursorCol += footerIconSize + 8;
    return item;
  });
  const footerW = Math.max(isColumn ? 250 : cursorRow, 140);
  const footerH = isColumn ? cursorCol + 20 : footerIconSize + 20;

  // ── Badge pesan-antar (logo ShopeeFood/GoFood/GrabFood) — di luar sosmed ──
  const dScale = overrides.delivery?.scale ?? 1;
  const dAlign = overrides.delivery?.align ?? "left";
  const CHIP_H = 76 * dScale;
  const CHIP_W = Math.round(((76 * 130) / 104) * dScale); // chip PNG rasio 1.25:1
  const DELIVERY_GAP = 14 * dScale;
  const DELIVERY_HEADING_H = 34 * dScale;
  const DELIVERY_HEADING_FONT = 28 * dScale;
  const deliveryIds = (overrides.delivery?.ids ?? []).filter((id) => DELIVERY_MAP[id]);
  const deliveryLabel = overrides.delivery?.label ?? "Available on";
  const deliveryDefaultY = Math.round(layout.canvas.height * 0.75);
  const deliveryX = (overrides.delivery?.x ?? 60) * scale;
  const deliveryY = (overrides.delivery?.y ?? deliveryDefaultY) * scale;
  const deliveryItems = deliveryIds.map((id, i) => ({ id, offsetX: i * (CHIP_W + DELIVERY_GAP) }));
  const deliveryW = deliveryIds.length > 0 ? deliveryIds.length * CHIP_W + (deliveryIds.length - 1) * DELIVERY_GAP : 0;
  const deliveryH = DELIVERY_HEADING_H + CHIP_H;

  function toggleDelivery(id: string) {
    const cur = overrides.delivery;
    const ids = cur?.ids ?? [];
    const nextIds = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    if (nextIds.length === 0) {
      const next = { ...overrides };
      delete next.delivery;
      onOverridesChange(next);
      return;
    }
    onOverridesChange({
      ...overrides,
      delivery: { ids: nextIds, x: cur?.x ?? 60, y: cur?.y ?? deliveryDefaultY, label: cur?.label ?? "Available on", scale: cur?.scale, align: cur?.align },
    });
  }

  function updateDelivery(p: { x: number; y: number }) {
    if (!overrides.delivery) return;
    onOverridesChange({ ...overrides, delivery: { ...overrides.delivery, x: p.x, y: p.y } });
  }

  function setDeliveryLabel(label: string) {
    if (!overrides.delivery) return;
    onOverridesChange({ ...overrides, delivery: { ...overrides.delivery, label } });
  }

  function setDeliveryScale(s: number) {
    if (!overrides.delivery) return;
    onOverridesChange({ ...overrides, delivery: { ...overrides.delivery, scale: s } });
  }

  function setDeliveryAlign(a: "left" | "center" | "right") {
    if (!overrides.delivery) return;
    onOverridesChange({ ...overrides, delivery: { ...overrides.delivery, align: a } });
  }

  // Panel teks mengikuti slot teks yang SEDANG dipilih (klik teksnya dulu),
  // fallback ke slot teks pertama. Ini yang membuat tiap deskripsi bisa diatur
  // font/ukuran/warna/shadow-nya, bukan cuma judul.
  const captionSlot = textSlots.find((s) => s.id === selectedId) ?? textSlots[0] ?? null;
  const captionEff = captionSlot ? effectiveText(captionSlot) : null;
  const hasShadow = !!(captionEff?.shadow);
  const shadowBlur = captionEff?.shadow?.blur ?? 8;
  const shadowColor = captionEff?.shadow?.color ?? "#000000";
  const shadowOpacity = captionEff?.shadow?.opacity ?? 0.6;
  const hasOutline = !!(captionEff?.outline);
  const outlineWidth = captionEff?.outline?.width ?? 3;
  const outlineColor = captionEff?.outline?.color ?? "#000000";

  // Foto latar — ambil dari slot image pertama
  const photoSlot = imageSlots[0];
  const photoSrc = photoSlot ? (values[photoSlot.id] ?? "") : "";
  // Scrim preview hanya ditampilkan kalau template memang punya dekorasi gelap
  // di depan (mis. polos / produk-latar). Template interaksi tak punya → tanpa
  // kotak hitam.
  const hasFrontScrim = (layout.decorations ?? []).some((d) => (d.layer ?? "back") === "front");

  return (
    <div ref={wrapRef} className="flex w-full max-w-full flex-col gap-3">
      {/* Container preview */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200"
        style={{ width: previewWidth, height: previewHeight, background: "#1e293b" }}>

        {/* WYSIWYG ghost: render Satori asli sebagai latar (persis hasil export) */}
        {ghostUrl ? (
          <img src={ghostUrl} alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, pointerEvents: "none" }} />
        ) : null}
        {/* ① Foto latar — HTML img tag, bebas masalah CORS/Konva */}
        {!ghostUrl && photoSrc ? (
          <img src={photoSrc} alt=""
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              transform: "scale(1.04)",
              zIndex: 0, pointerEvents: "none",
            }} />
        ) : null}

        {/* ② Scrim gradient (simulasi dekorasi template) — hanya kalau template punya */}
        {!ghostUrl && photoSrc && hasFrontScrim ? (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: "38%",
            background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.12) 30%, rgba(0,0,0,0.72) 100%)",
            zIndex: 1, pointerEvents: "none",
          }} />
        ) : null}

        {/* ③ Konva: teks, logo, sosmed — di atas foto */}
        <Stage width={previewWidth} height={previewHeight}
          style={{ position: "relative", zIndex: 2 }}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          onMouseDown={(e) => { if (e.target === e.target.getStage()) setSelectedId(null); }}>
          <Layer>
            {/* Teks */}
            {textSlots.map((slot) => {
              const eff = effectiveText(slot);
              const shadow = eff.shadow
                ? { shadowColor: eff.shadow.color, shadowBlur: eff.shadow.blur * scale,
                    shadowOpacity: eff.shadow.opacity, shadowOffsetX: 0, shadowOffsetY: 0 }
                : {};
              const outline = eff.outline && eff.outline.width > 0
                ? { stroke: eff.outline.color, strokeWidth: eff.outline.width * scale, fillAfterStrokeEnabled: true }
                : {};
              return (
                <KonvaText key={slot.id}
                  text={values[slot.id] || slot.placeholder || ""}
                  x={eff.box.x * scale} y={eff.box.y * scale} width={eff.box.width * scale}
                  fontFamily={eff.fontFamily} fontSize={eff.fontSize * scale}
                  fontStyle={eff.fontWeight >= 600 ? "bold" : "normal"}
                  fill={eff.color} align={eff.align} opacity={ghostUrl ? (dragging ? 1 : 0) : 1} {...outline} {...shadow}
                  draggable dragBoundFunc={clampDrag}
                  onClick={() => setSelectedId(slot.id)} onTap={() => setSelectedId(slot.id)}
                  onDragMove={handleSnapDragMove}
                  onDragEnd={(e) => { const n = e.target; updateSlotBox(slot.id, n.x(), n.y(), eff.box.width, eff.box.height); clearGuides(); }}
                  onDblClick={(e) => openEdit(slot.id, e.target as Konva.Text)}
                  onDblTap={(e) => openEdit(slot.id, e.target as Konva.Text)} />
              );
            })}

            {/* Footer sosmed */}
            <Group x={footerX} y={footerY} opacity={ghostUrl ? (dragging ? 1 : 0) : 1} draggable dragBoundFunc={clampDrag}
              onClick={() => setSelectedId("__footer__")} onTap={() => setSelectedId("__footer__")}
              onDragMove={handleSnapDragMove}
              onDragEnd={(e) => { const n = e.target; updateFooter({ x: n.x() / scale, y: n.y() / scale }); clearGuides(); }}>
              <Rect x={-8} y={-8} width={(footerW + 16) * scale} height={(footerH + 16) * scale} fill="transparent" />
              {footerSocials.length === 0 ? (
                <>
                  <Rect width={160 * scale} height={30 * scale} fill="rgba(15,23,42,0.7)" cornerRadius={6} />
                  <KonvaText text={footerPreviewText || "Sosial Media"} width={160 * scale} height={30 * scale}
                    align="center" verticalAlign="middle" fontSize={11 * scale} fill="#fff" listening={false} />
                </>
              ) : (
                <>
                  {selectedId === "__footer__" ? (
                    <Rect x={-4} y={-4} width={(footerW + 8) * scale} height={(footerH + 8) * scale}
                      stroke="#0FB6A6" strokeWidth={2} dash={[4, 3]} listening={false} />
                  ) : null}
                  {socialItems.map((s) => (
                    <FooterSocialItem key={s.platformId} platformId={s.platformId} value={s.value}
                      offsetX={s.offsetX} offsetY={s.offsetY}
                      iconSize={footerIconSize} textSize={footerTextSize}
                      textColor={fl.textColor} scale={scale} isColumn={isColumn} />
                  ))}
                </>
              )}
            </Group>

            {/* Badge pesan-antar (logo + heading) */}
            {deliveryIds.length > 0 ? (
              <Group x={deliveryX} y={deliveryY} opacity={ghostUrl ? (dragging ? 1 : 0) : 1} draggable dragBoundFunc={clampDrag}
                onClick={() => setSelectedId("__delivery__")} onTap={() => setSelectedId("__delivery__")}
                onDragMove={handleSnapDragMove}
                onDragEnd={(e) => { const n = e.target; updateDelivery({ x: n.x() / scale, y: n.y() / scale }); clearGuides(); }}>
                <Rect x={-8} y={-8} width={(deliveryW + 16) * scale} height={(deliveryH + 16) * scale} fill="transparent" />
                {selectedId === "__delivery__" ? (
                  <Rect x={-4} y={-4} width={(deliveryW + 8) * scale} height={(deliveryH + 8) * scale}
                    stroke="#0FB6A6" strokeWidth={2} dash={[4, 3]} listening={false} />
                ) : null}
                {deliveryLabel ? (
                  <KonvaText text={deliveryLabel} x={0} y={0} width={deliveryW * scale} align={dAlign}
                    fontSize={DELIVERY_HEADING_FONT * scale}
                    fontStyle="bold" fill="#ffffff" shadowColor="#000" shadowBlur={4 * scale}
                    shadowOpacity={0.5} listening={false} />
                ) : null}
                {deliveryItems.map((it) => (
                  <Group key={it.id} x={it.offsetX * scale} y={DELIVERY_HEADING_H * scale} listening={false}>
                    <DeliveryChipKonva id={it.id} w={CHIP_W} h={CHIP_H} scale={scale} />
                  </Group>
                ))}
              </Group>
            ) : null}

            {/* Logo */}
            {logoImg ? (
              <Group x={logoPos.x * scale} y={logoPos.y * scale} opacity={ghostUrl ? (dragging ? 1 : 0) : 1} draggable dragBoundFunc={clampLogoDrag}
                onClick={() => setSelectedId("__logo__")} onTap={() => setSelectedId("__logo__")}
                onDblClick={toggleLogoVariant} onDblTap={toggleLogoVariant}
                onDragMove={handleSnapDragMove}
                onDragEnd={(e) => { const n = e.target; updateLogo({ x: n.x() / scale, y: n.y() / scale }); clearGuides(); }}>
                {/* Area drag transparan — wajib agar Group bisa di-drag */}
                <Rect width={logoPos.size * scale} height={logoPos.size * scale} fill="transparent" />
                {selectedId === "__logo__" ? (
                  <Rect width={logoPos.size * scale} height={logoPos.size * scale}
                    stroke="#0FB6A6" strokeWidth={2} dash={[4, 3]} listening={false} />
                ) : null}
                <LogoKonva url={logoUrl!} size={logoPos.size} scale={scale} />
              </Group>
            ) : null}

            {/* Garis panduan (smart guides) — cuma visual, tidak pernah tersimpan */}
            {guides.v.map((x, i) => (
              <KonvaLine key={`guide-v-${i}`} points={[x, 0, x, previewHeight]}
                stroke="#0FB6A6" strokeWidth={1.5} dash={[5, 4]} listening={false} />
            ))}
            {guides.h.map((y, i) => (
              <KonvaLine key={`guide-h-${i}`} points={[0, y, previewWidth, y]}
                stroke="#0FB6A6" strokeWidth={1.5} dash={[5, 4]} listening={false} />
            ))}
          </Layer>
        </Stage>

        {/* Edit teks inline */}
        {editingSlotId && editingBox ? (
          <textarea autoFocus aria-label="Edit teks"
            className="absolute resize-none rounded border-2 border-primary bg-white/95 px-1.5 py-1 text-sm leading-tight text-navy shadow-lg focus:outline-none"
            style={{ left: editingBox.x, top: editingBox.y, width: editingBox.width, minHeight: editingBox.height, zIndex: 10 }}
            defaultValue={values[editingSlotId] ?? ""}
            onBlur={(e) => commitEdit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
              if (e.key === "Escape") { setEditingSlotId(null); setEditingBox(null); }
            }} />
        ) : null}
      </div>

      <p className="text-xs text-navy/50">Geser teks, sosmed, atau logo — otomatis nempel (snap) ke tengah/tepi. Klik logo/sosmed untuk atur. Dobel-klik teks untuk edit isi{canToggleLogo ? ", dobel-klik logo untuk ganti versi terang/gelap" : ""}.</p>

      {/* Panel pesan-antar (untuk konten makanan/minuman) */}
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-navy">Lampirkan pesan-antar:</span>
          {DELIVERY_PLATFORMS.map((p) => {
            const on = deliveryIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleDelivery(p.id)}
                className={`rounded-full border px-3 py-1 font-medium transition ${on ? "text-white" : "border-line text-navy/60 hover:bg-navy/5"}`}
                style={on ? { backgroundColor: p.color, borderColor: p.color } : undefined}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {deliveryIds.length > 0 ? (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <span className="text-navy/60">Teks di atas:</span>
              <input
                type="text"
                value={deliveryLabel}
                onChange={(e) => setDeliveryLabel(e.target.value)}
                placeholder="Available on"
                className="w-40 rounded-lg border border-line px-2 py-1 text-navy focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-navy/40">(kosongkan untuk hilangkan)</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-navy/60">Ukuran:</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={dScale}
                onChange={(e) => setDeliveryScale(Number(e.target.value))}
                className="w-40 accent-primary"
              />
              <span className="w-10 text-navy/60">{Math.round(dScale * 100)}%</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-navy/60">Posisi teks:</span>
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setDeliveryAlign(a)}
                  className={`rounded-full border px-3 py-1 ${dAlign === a ? "border-primary bg-primary/10 text-primary" : "border-line text-navy/60 hover:bg-navy/5"}`}
                >
                  {a === "left" ? "Kiri" : a === "center" ? "Tengah" : "Kanan"}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Panel Logo */}
      {selectedId === "__logo__" && logoImg ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3 text-xs">
          <span className="font-semibold text-navy">Logo</span>
          <HelpTip title="Atur logo" align="left" text={
            <span className="flex flex-col gap-1.5">
              <span>Geser logo untuk memindahkan posisinya.</span>
              <span><b>Dobel-klik logo</b> untuk ganti versi <b>terang/gelap</b> (biar kontras dengan latar).</span>
              <span>Atur besar-kecilnya dengan slider <b>Ukuran</b>.</span>
            </span>
          } />
          <label className="flex items-center gap-2">
            <span className="text-navy/60">Ukuran</span>
            <input type="range" min={Math.round(layout.canvas.width * 0.05)} max={Math.round(layout.canvas.width * 0.45)}
              value={Math.round(logoPos.size)} onChange={(e) => updateLogo({ size: Number(e.target.value) })} />
            <span className="tabular-nums text-navy/60">{Math.round(logoPos.size)}px</span>
          </label>
          {canToggleLogo ? (
            <div className="flex items-center gap-1">
              <span className="text-navy/60">Versi</span>
              <button type="button" onClick={() => onLogoVariantChange?.("light")}
                className={`rounded border px-2 py-1 ${logoVariant === "light" ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"}`}>Terang</button>
              <button type="button" onClick={() => onLogoVariantChange?.("dark")}
                className={`rounded border px-2 py-1 ${logoVariant === "dark" ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"}`}>Gelap</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Panel Sosmed */}
      {selectedId === "__footer__" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3 text-xs">
          <span className="font-semibold text-navy">Sosmed</span>
          <HelpTip title="Atur sosmed" align="left" text={
            <span className="flex flex-col gap-1.5">
              <span>Baris akun sosial media (Instagram, WhatsApp, dll) di bawah gambar.</span>
              <span>Geser untuk memindahkan; atur <b>Arah</b> (mendatar/menurun) serta ukuran <b>Ikon</b> & <b>Teks</b>.</span>
              <span>Isi akun sosmednya di menu <b>Dashboard → Sosial Media</b>.</span>
            </span>
          } />
          <div className="flex items-center gap-1">
            <span className="text-navy/60">Arah</span>
            <button type="button" onClick={() => updateFooter({ direction: "row" })}
              className={`rounded border px-2 py-1 ${footerDir === "row" ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"}`}>Mendatar</button>
            <button type="button" onClick={() => updateFooter({ direction: "column" })}
              className={`rounded border px-2 py-1 ${footerDir === "column" ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"}`}>Menurun</button>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-navy/60">Ikon</span>
            <input type="range" min={20} max={80} value={footerIconSize} onChange={(e) => updateFooter({ iconSize: Number(e.target.value) })} />
            <span className="tabular-nums text-navy/60">{footerIconSize}px</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-navy/60">Teks</span>
            <input type="range" min={14} max={50} value={footerTextSize} onChange={(e) => updateFooter({ textSize: Number(e.target.value) })} />
            <span className="tabular-nums text-navy/60">{footerTextSize}px</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-navy/60">Jarak</span>
            <input type="range" min={0} max={90} value={footerGap} onChange={(e) => updateFooter({ gap: Number(e.target.value) })} />
            <span className="tabular-nums text-navy/60">{footerGap}px</span>
          </label>
        </div>
      ) : null}

      {/* Panel Teks */}
      {captionSlot && captionEff ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3 text-xs">
          <span className="font-semibold text-navy">Teks{captionSlot.label ? `: ${captionSlot.label}` : ""}</span>
          <HelpTip title="Atur teks" align="left" text={
            <span className="flex flex-col gap-1.5">
              <span>Geser teks langsung di gambar untuk memindahkannya.</span>
              <span><b>Dobel-klik</b> teks untuk mengubah isinya.</span>
              <span>Atur <b>Font</b>, <b>Ukuran</b>, <b>Rata</b> (kiri/tengah/kanan), dan warna.</span>
              <span><b>Shadow</b> = bayangan, <b>Outline</b> = garis tepi. Aktifkan biar teks tetap terbaca di atas gambar terang/ramai.</span>
            </span>
          } />
          <label className="flex items-center gap-1.5">
            <span className="text-navy/60">Font</span>
            <select value={captionEff.fontFamily} onChange={(e) => updateSlot(captionSlot.id, { fontFamily: e.target.value })}
              className="rounded border border-line px-2 py-1 text-xs">
              {FONT_OPTIONS.map((f) => <option key={f.id} value={f.family}>{f.label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-navy/60">Ukuran</span>
            <input type="range" min={16} max={140} value={Math.round(captionEff.fontSize)}
              onChange={(e) => updateSlot(captionSlot.id, { fontSize: Number(e.target.value) })} />
            <span className="tabular-nums text-navy/60">{Math.round(captionEff.fontSize)}px</span>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-navy/60">Warna</span>
            <input type="color" value={captionEff.color} onChange={(e) => updateSlot(captionSlot.id, { color: e.target.value })}
              className="h-6 w-8 rounded border border-line" />
          </label>
          <div className="flex items-center gap-1">
            <span className="text-navy/60">Rata</span>
            {(["left", "center", "right"] as const).map((align) => (
              <button key={align} type="button" onClick={() => updateSlot(captionSlot.id, { align })}
                className={`rounded border px-2 py-1 ${captionEff.align === align ? "border-primary bg-primary/10 text-primary" : "border-line text-navy"}`}>
                {ALIGN_LABEL[align]}
              </button>
            ))}
          </div>
          <div className="w-full border-t border-line pt-2 flex flex-wrap items-center gap-3">
            <span className="text-navy/60 font-medium">Shadow</span>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={hasShadow}
                onChange={(e) => updateSlot(captionSlot.id, { shadow: e.target.checked ? { blur: 8, color: "#000000", opacity: 0.6 } : null })} />
              <span className="text-navy/60">Aktif</span>
            </label>
            {hasShadow ? (
              <>
                <label className="flex items-center gap-2">
                  <span className="text-navy/60">Blur</span>
                  <input type="range" min={2} max={40} value={shadowBlur}
                    onChange={(e) => updateSlot(captionSlot.id, { shadow: { blur: Number(e.target.value), color: shadowColor, opacity: shadowOpacity } })} />
                  <span className="tabular-nums text-navy/60">{shadowBlur}px</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="text-navy/60">Warna shadow</span>
                  <input type="color" value={shadowColor}
                    onChange={(e) => updateSlot(captionSlot.id, { shadow: { blur: shadowBlur, color: e.target.value, opacity: shadowOpacity } })}
                    className="h-6 w-8 rounded border border-line" />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-navy/60">Opasitas</span>
                  <input type="range" min={10} max={100} value={Math.round(shadowOpacity * 100)}
                    onChange={(e) => updateSlot(captionSlot.id, { shadow: { blur: shadowBlur, color: shadowColor, opacity: Number(e.target.value) / 100 } })} />
                  <span className="tabular-nums text-navy/60">{Math.round(shadowOpacity * 100)}%</span>
                </label>
              </>
            ) : null}
          </div>
          <div className="w-full border-t border-line pt-2 flex flex-wrap items-center gap-3">
            <span className="text-navy/60 font-medium">Outline</span>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={hasOutline}
                onChange={(e) => updateSlot(captionSlot.id, { outline: e.target.checked ? { width: 3, color: "#000000" } : null })} />
              <span className="text-navy/60">Aktif</span>
            </label>
            {hasOutline ? (
              <>
                <label className="flex items-center gap-2">
                  <span className="text-navy/60">Tebal</span>
                  <input type="range" min={1} max={12} value={outlineWidth}
                    onChange={(e) => updateSlot(captionSlot.id, { outline: { width: Number(e.target.value), color: outlineColor } })} />
                  <span className="tabular-nums text-navy/60">{outlineWidth}px</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="text-navy/60">Warna outline</span>
                  <input type="color" value={outlineColor}
                    onChange={(e) => updateSlot(captionSlot.id, { outline: { width: outlineWidth, color: e.target.value } })}
                    className="h-6 w-8 rounded border border-line" />
                </label>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

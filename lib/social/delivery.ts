// Platform pesan-antar (di luar sosial media) — dilampirkan pada konten
// makanan/minuman lewat canvas editor.
export type DeliveryPlatform = { id: string; label: string; color: string };

export const DELIVERY_PLATFORMS: DeliveryPlatform[] = [
  { id: "shopeefood", label: "ShopeeFood", color: "#EE4D2D" },
  { id: "gofood", label: "GoFood", color: "#00AA13" },
  { id: "grabfood", label: "GrabFood", color: "#00B14F" },
];

export const DELIVERY_MAP: Record<string, DeliveryPlatform> = Object.fromEntries(
  DELIVERY_PLATFORMS.map((p) => [p.id, p]),
);

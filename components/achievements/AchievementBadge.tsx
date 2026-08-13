// components/achievements/AchievementBadge.tsx
// Badge SVG achievement (digambar via kode, tanpa file gambar).
// Presentasional murni — terima props, tidak fetch apa pun.
//
// Contoh pakai:
//   <AchievementBadge tier={tier} size={44} />
//   <AchievementBadge tier={null} size={44} />  // belum mencapai Starter (abu redup)

"use client";

import type { Tier } from "@/lib/achievements/tiers";

type Props = {
  tier: Tier | null;
  size?: number; // px
  showLabel?: boolean;
};

export default function AchievementBadge({ tier, size = 44, showLabel = false }: Props) {
  const warna = tier ? tier.color : "#cbd5e1";
  const bintang = tier ? starCount(tier.id) : 0;
  const label = tier ? tier.label : "Belum ada";

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      title={tier ? `Peringkat: ${tier.label}` : "Belum mencapai peringkat (butuh 30 hari aktif)"}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label={`Badge ${label}`}
      >
        {/* Perisai */}
        <path
          d="M32 4 L54 12 V32 C54 46 44 55 32 60 C20 55 10 46 10 32 V12 Z"
          fill={warna}
          opacity={tier ? 1 : 0.35}
        />
        <path
          d="M32 4 L54 12 V32 C54 46 44 55 32 60 C20 55 10 46 10 32 V12 Z"
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="2"
        />
        {/* Kilau */}
        <path
          d="M32 4 L54 12 V20 C46 16 38 14 32 14 C26 14 18 16 10 20 V12 Z"
          fill="rgba(255,255,255,0.25)"
        />
        {/* Bintang kecil sesuai peringkat (1=Starter ... 6=Legend) */}
        {Array.from({ length: bintang }).map((_, i) => {
          const per = 10;
          const lebar = (bintang - 1) * per;
          const x = 32 - lebar / 2 + i * per;
          return <Star key={i} cx={x} cy={30} r={4} />;
        })}
        {/* Inisial peringkat */}
        <text
          x="32"
          y="49"
          textAnchor="middle"
          fontSize="14"
          fontWeight="800"
          fill="#ffffff"
        >
          {tier ? tier.label[0] : "?"}
        </text>
      </svg>
      {showLabel ? (
        <span style={{ fontWeight: 700, color: tier ? "#0f172a" : "#94a3b8" }}>
          {label}
        </span>
      ) : null}
    </span>
  );
}

function starCount(id: string): number {
  switch (id) {
    case "starter":
      return 1;
    case "creator":
      return 2;
    case "builder":
      return 3;
    case "pro":
      return 4;
    case "master":
      return 5;
    case "legend":
      return 6;
    default:
      return 0;
  }
}

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const jarak = i % 2 === 0 ? r : r / 2.2;
    const sudut = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + jarak * Math.cos(sudut)},${cy + jarak * Math.sin(sudut)}`);
  }
  return <polygon points={pts.join(" ")} fill="#ffffff" opacity="0.95" />;
}

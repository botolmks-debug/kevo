import type { ReactNode } from "react";

// Satori tidak mendukung elemen SVG <text> (lihat error "convert them to
// <path>") — jadi semua ikon di sini HARUS cuma pakai rect/circle/line/
// polygon/path (path hanya garis lurus M/L, tanpa lengkung).
type IconDef = {
  bg: string;
  fg: string;
  render: (fg: string) => ReactNode;
};

function shoppingBag(fg: string) {
  return (
    <>
      <line x1="8" y1="5" x2="8" y2="9" stroke={fg} strokeWidth="1.6" />
      <line x1="16" y1="5" x2="16" y2="9" stroke={fg} strokeWidth="1.6" />
      <rect x="5" y="8" width="14" height="11" rx="2" fill={fg} />
    </>
  );
}

const ICONS: Record<string, IconDef> = {
  instagram: {
    bg: "#E1306C",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <rect x="5" y="5" width="14" height="14" rx="4" stroke={fg} strokeWidth="1.8" fill="none" />
        <circle cx="12" cy="12" r="3.6" stroke={fg} strokeWidth="1.8" fill="none" />
        <circle cx="16" cy="8" r="1" fill={fg} />
      </>
    ),
  },
  whatsapp: {
    bg: "#25D366",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <circle cx="12" cy="11" r="7" fill={fg} />
        <polygon points="9,17 9,21 13,17" fill={fg} />
        <path d="M8.5 11l2 2 4-4.5" stroke="#25D366" strokeWidth="1.6" fill="none" />
      </>
    ),
  },
  facebook: {
    bg: "#1877F2",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <rect x="9" y="5" width="3" height="14" fill={fg} />
        <rect x="9" y="5" width="7" height="3" fill={fg} />
        <rect x="9" y="10.5" width="5.5" height="3" fill={fg} />
      </>
    ),
  },
  tiktok: {
    bg: "#000000",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <circle cx="9" cy="16" r="3" fill={fg} />
        <rect x="11" y="4" width="2" height="12" fill={fg} />
        <rect x="11" y="4" width="5" height="2" fill={fg} />
      </>
    ),
  },
  youtube: {
    bg: "#FF0000",
    fg: "#ffffff",
    render: (fg) => <polygon points="10,7 18,12 10,17" fill={fg} />,
  },
  x: {
    bg: "#000000",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <line x1="7" y1="7" x2="17" y2="17" stroke={fg} strokeWidth="2" />
        <line x1="17" y1="7" x2="7" y2="17" stroke={fg} strokeWidth="2" />
      </>
    ),
  },
  line: {
    bg: "#06C755",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <rect x="4" y="6" width="16" height="12" rx="6" fill={fg} />
        <circle cx="9" cy="12" r="1.2" fill="#06C755" />
        <circle cx="12" cy="12" r="1.2" fill="#06C755" />
        <circle cx="15" cy="12" r="1.2" fill="#06C755" />
      </>
    ),
  },
  telegram: {
    bg: "#229ED9",
    fg: "#ffffff",
    render: (fg) => <polygon points="4,12 20,4 14,20 11,13" fill={fg} />,
  },
  threads: {
    bg: "#000000",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <circle cx="12" cy="12" r="6" stroke={fg} strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="2" fill={fg} />
      </>
    ),
  },
  linkedin: {
    bg: "#0A66C2",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <rect x="6" y="7" width="3" height="3" fill={fg} />
        <rect x="6" y="12" width="3" height="7" fill={fg} />
        <rect x="12" y="12" width="3" height="7" fill={fg} />
        <rect x="12" y="10" width="8" height="3" fill={fg} />
        <rect x="17" y="12" width="3" height="7" fill={fg} />
      </>
    ),
  },
  wechat: {
    bg: "#07C160",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <circle cx="9" cy="10" r="5" fill={fg} />
        <circle cx="15" cy="14" r="5" fill={fg} />
      </>
    ),
  },
  xiaohongshu: {
    bg: "#FF2442",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <rect x="6" y="4" width="12" height="16" rx="2" fill={fg} />
        <rect x="9" y="9" width="6" height="1.6" fill="#FF2442" />
        <rect x="9" y="13" width="6" height="1.6" fill="#FF2442" />
      </>
    ),
  },
  kakaotalk: {
    bg: "#FEE500",
    fg: "#3C1E1E",
    render: (fg) => (
      <>
        <rect x="4" y="6" width="16" height="12" rx="6" fill={fg} />
        <polygon points="15,17 15,21 19,17" fill={fg} />
      </>
    ),
  },
  zalo: {
    bg: "#0068FF",
    fg: "#ffffff",
    render: (fg) => <path d="M7 7h10l-10 10h10" stroke={fg} strokeWidth="2" fill="none" />,
  },
  shopee: {
    bg: "#EE4D2D",
    fg: "#ffffff",
    render: (fg) => shoppingBag(fg),
  },
  tokopedia: {
    bg: "#42B549",
    fg: "#ffffff",
    render: (fg) => shoppingBag(fg),
  },
  lazada: {
    bg: "#0F146D",
    fg: "#ffffff",
    render: (fg) => shoppingBag(fg),
  },
  website: {
    bg: "#334155",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <circle cx="12" cy="12" r="8" stroke={fg} strokeWidth="1.6" fill="none" />
        <line x1="4" y1="12" x2="20" y2="12" stroke={fg} strokeWidth="1.4" />
        <line x1="12" y1="4" x2="12" y2="20" stroke={fg} strokeWidth="1.4" />
      </>
    ),
  },
};

function fallbackIcon(): IconDef {
  return {
    bg: "#64748b",
    fg: "#ffffff",
    render: (fg) => (
      <>
        <circle cx="12" cy="12" r="7" stroke={fg} strokeWidth="1.8" fill="none" />
        <circle cx="12" cy="12" r="2.4" fill={fg} />
      </>
    ),
  };
}

export function SocialIcon({ platformId, size }: { platformId: string; size: number }) {
  const def = ICONS[platformId] ?? fallbackIcon();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="0" y="0" width="24" height="24" rx="6" fill={def.bg} />
      {def.render(def.fg)}
    </svg>
  );
}

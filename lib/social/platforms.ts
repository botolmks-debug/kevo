export type SocialPlatform = { id: string; label: string };

// Daftar platform yang umum dipakai bisnis di Asia. Tambahkan entri baru di
// sini kalau ada platform relevan lain — dipakai di onboarding & footer template.
export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: "instagram", label: "Instagram" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X (Twitter)" },
  { id: "line", label: "LINE" },
  { id: "telegram", label: "Telegram" },
  { id: "threads", label: "Threads" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "wechat", label: "WeChat" },
  { id: "xiaohongshu", label: "Xiaohongshu (RED)" },
  { id: "kakaotalk", label: "KakaoTalk" },
  { id: "zalo", label: "Zalo" },
  { id: "shopee", label: "Shopee" },
  { id: "tokopedia", label: "Tokopedia" },
  { id: "lazada", label: "Lazada" },
  { id: "website", label: "Website" },
];

export const MAX_SELECTED_SOCIALS = 3;

export function getSocialPlatformLabel(id: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

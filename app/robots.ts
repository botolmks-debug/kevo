import type { MetadataRoute } from "next";

// Path privat yang di-disallow SAMA untuk semua bot (dipakai berulang di
// bawah — jangan diketik ulang per bot, gampang typo/beda satu sama lain).
const DISALLOW_PRIVATE = [
  "/dashboard", "/onboarding", "/admin", "/api/",
  "/generate", "/generate-otomatis", "/gambar", "/konten", "/jadwal", "/video", "/topup",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW_PRIVATE },
      // Entri EKSPLISIT per crawler AI (GEO — Generative Engine Optimization):
      // beberapa AI assistant/answer-engine mengecek nama user-agent mereka
      // sendiri secara eksplisit di robots.txt sbg sinyal "diizinkan", bukan
      // cuma mengandalkan wildcard "*" di atas (yang sebenarnya sudah cukup
      // mengizinkan mereka juga). Baris ini murni supaya niat "boleh
      // dicrawl/dikutip AI" terlihat jelas & sengaja, bukan menambah izin baru.
      { userAgent: "GPTBot", allow: "/", disallow: DISALLOW_PRIVATE }, // ChatGPT (OpenAI)
      { userAgent: "ChatGPT-User", allow: "/", disallow: DISALLOW_PRIVATE }, // ChatGPT browsing saat dipakai user
      { userAgent: "ClaudeBot", allow: "/", disallow: DISALLOW_PRIVATE }, // Claude (Anthropic)
      { userAgent: "Claude-Web", allow: "/", disallow: DISALLOW_PRIVATE },
      { userAgent: "PerplexityBot", allow: "/", disallow: DISALLOW_PRIVATE }, // Perplexity
      { userAgent: "Google-Extended", allow: "/", disallow: DISALLOW_PRIVATE }, // Gemini/AI Overviews (training+grounding)
      { userAgent: "Amazonbot", allow: "/", disallow: DISALLOW_PRIVATE }, // Alexa/Amazon AI
      { userAgent: "Applebot-Extended", allow: "/", disallow: DISALLOW_PRIVATE }, // Apple Intelligence/Siri
    ],
    sitemap: "https://www.keposting.com/sitemap.xml",
  };
}

/**
 * Validasi email untuk halaman demo.
 * Dua lapis: format benar + bukan domain sampah/sekali-pakai.
 * (Ini TIDAK memverifikasi email itu benar-benar milik orangnya —
 *  penyaring itu adalah "hasil dikirim ke email": email palsu = tak dapat hasil.)
 */

// domain yang jelas bukan email asli / email sekali-pakai populer.
// Tambah sendiri kalau menemукan yang baru di data demo_leads.
const BLOCKED_DOMAINS = new Set<string>([
  "example.com",
  "test.com",
  "test.test",
  "email.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "throwawaymail.com",
  "sharklasers.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
]);

const FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailCheck =
  | { ok: true; email: string }
  | { ok: false; reason: "format" | "domain" };

export function checkEmail(raw: string): EmailCheck {
  const email = (raw || "").trim().toLowerCase();

  if (!FORMAT.test(email)) return { ok: false, reason: "format" };

  const domain = email.split("@")[1] ?? "";
  if (BLOCKED_DOMAINS.has(domain)) return { ok: false, reason: "domain" };

  // domain tanpa titik kedua yang wajar / TLD terlalu pendek
  if (!/\.[a-z]{2,}$/.test(domain)) return { ok: false, reason: "domain" };

  return { ok: true, email };
}

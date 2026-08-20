// lib/instagram/access.ts
// Gerbang fitur Instagram.
// Selama App Review Meta belum lolos: hanya admin.
// Setelah lolos: set env IG_PUBLIC=true -> semua user bisa hubungkan IG sendiri.
import { isAdmin } from "@/lib/supabase/tokens";

export function igFeatureAllowed(email: string | null | undefined): boolean {
  if (process.env.IG_PUBLIC === "true") return true;
  return isAdmin(email ?? "");
}

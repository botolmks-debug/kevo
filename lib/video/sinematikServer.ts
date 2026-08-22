// lib/video/sinematikServer.ts
// Helper server-side khusus mode Sinematik — sengaja self-contained
// (tidak mengimpor lib lain) supaya ZIP ini aman di-extract tanpa konflik.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Fitur ini ADMIN-ONLY selama testing (sinkron dengan gerbang video lain).
const ADMIN_EMAILS = new Set(["botolmks@gmail.com", "andritjo@gmail.com"]);

export function isSinematikAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}

export async function getRouteUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* route handler: tidak perlu set */
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export function publicImageUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/user-images/${storagePath}`;
}

// Ambil profil bisnis + baris gambar milik user utk bahan storyboard.
export async function loadBahan(supabase: any, userId: string, imageIds: string[]) {
  const { data: profil } = await supabase
    .from("business_profile")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  const { data: imgs } = await supabase
    .from("images")
    .select("*")
    .eq("business_id", userId)
    .in("id", imageIds);

  return { profil: profil || {}, images: imgs || [] };
}

export async function fetchAsBase64(url: string): Promise<{ mimeType: string; base64: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal ambil gambar (${res.status}): ${url.slice(0, 80)}`);
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType, base64: buf.toString("base64") };
}

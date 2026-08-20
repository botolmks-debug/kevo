// lib/supabase/igConnections.ts
// CRUD tabel ig_connections. Selalu lewat service role (token rahasia).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type IgConnection = {
  business_id: string;
  ig_user_id: string;
  ig_username: string | null;
  page_id: string;
  page_name: string | null;
  access_token: string;
  token_expires_at: string | null;
};

export function createIgServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role env belum lengkap");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getConnection(businessId: string): Promise<IgConnection | null> {
  const db = createIgServiceClient();
  const { data, error } = await db
    .from("ig_connections")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as IgConnection) ?? null;
}

export async function upsertConnection(conn: IgConnection) {
  const db = createIgServiceClient();
  const { error } = await db.from("ig_connections").upsert(
    { ...conn, updated_at: new Date().toISOString() },
    { onConflict: "business_id" }
  );
  if (error) throw new Error(error.message);
}

export async function deleteConnection(businessId: string) {
  const db = createIgServiceClient();
  const { error } = await db.from("ig_connections").delete().eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

export async function updateToken(
  businessId: string,
  accessToken: string,
  expiresAt: Date
) {
  const db = createIgServiceClient();
  const { error } = await db
    .from("ig_connections")
    .update({
      access_token: accessToken,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

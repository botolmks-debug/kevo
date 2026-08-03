import type { SupabaseClient } from "@supabase/supabase-js";

export type VideoJobStatus = "processing" | "completed" | "failed";

export type VideoJobRow = {
  id: string;
  business_id: string;
  source_content_id: string | null;
  heygen_video_id: string | null;
  status: VideoJobStatus;
  script: string | null;
  avatar_id: string | null;
  voice_id: string | null;
  ratio: string | null;
  video_path: string | null;
  error: string | null;
  created_at: string;
};

type OkRow = { ok: true; row: VideoJobRow };
type OkMaybe = { ok: true; row: VideoJobRow | null };
type Err = { ok: false; error: string };

export async function insertVideoJob(
  client: SupabaseClient,
  input: {
    businessId: string;
    sourceContentId?: string | null;
    heygenVideoId: string;
    script: string;
    avatarId?: string | null;
    voiceId?: string | null;
    ratio: string;
  },
): Promise<OkRow | Err> {
  const { data, error } = await client
    .from("video_jobs")
    .insert({
      business_id: input.businessId,
      source_content_id: input.sourceContentId ?? null,
      heygen_video_id: input.heygenVideoId,
      status: "processing",
      script: input.script,
      avatar_id: input.avatarId ?? null,
      voice_id: input.voiceId ?? null,
      ratio: input.ratio,
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, row: data as VideoJobRow };
}

/** Ambil satu job DAN verifikasi kepemilikan (business_id harus cocok). */
export async function getVideoJob(
  client: SupabaseClient,
  id: string,
  businessId: string,
): Promise<OkMaybe | Err> {
  const { data, error } = await client
    .from("video_jobs")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, row: (data as VideoJobRow) ?? null };
}

export async function updateVideoJob(
  client: SupabaseClient,
  id: string,
  patch: Partial<Pick<VideoJobRow, "status" | "video_path" | "error">>,
): Promise<{ ok: true } | Err> {
  const { error } = await client.from("video_jobs").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

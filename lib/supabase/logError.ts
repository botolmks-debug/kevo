/**
 * Supabase/Postgrest error objects sering tidak ke-serialize dengan baik
 * lewat `console.error(label, error)` (banyak logger cuma dapat "{}").
 * Ambil field yang biasa dipakai (code/message/details/hint) secara
 * eksplisit supaya selalu kebaca di log server.
 */
export function describeSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return String(error);
  }
  const e = error as Record<string, unknown>;
  return `code=${e.code} message=${e.message} details=${e.details} hint=${e.hint}`;
}

// lib/instagram/pendingCookie.ts
// Simpan sementara (10 menit) token + daftar akun IG kandidat di cookie
// terenkripsi (AES-256-GCM), dipakai saat user punya >1 akun dan harus memilih.

import crypto from "crypto";
import type { IgAccount } from "@/lib/instagram/api";

export const IG_PENDING_COOKIE = "ig_pending";
export const IG_PENDING_MAX_AGE = 600; // detik

export type IgPendingPayload = {
  userId: string;
  accessToken: string;
  expiresAt: string; // ISO
  accounts: IgAccount[];
};

function key(): Buffer {
  return crypto
    .createHash("sha256")
    .update(process.env.META_APP_SECRET || "dev")
    .digest();
}

export function encryptPending(payload: IgPendingPayload): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, data]).toString("base64url");
}

export function decryptPending(token: string): IgPendingPayload | null {
  try {
    const raw = Buffer.from(token, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return JSON.parse(json) as IgPendingPayload;
  } catch {
    return null;
  }
}

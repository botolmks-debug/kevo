/**
 * Bagikan konten (gambar + caption). Di HP: memakai Web Share API → membuka
 * share-sheet sistem, user tinggal pilih Instagram (foto ikut, caption ikut/
 * bisa ditempel). Di desktop / browser tanpa Web Share: fallback → caption
 * disalin ke clipboard + gambar diunduh, lalu user upload manual ke IG.
 */
export type ShareResult = "shared" | "fallback" | "error";

export async function shareContent(
  source: Blob | string,
  caption: string,
  filename = "kevo.png",
): Promise<ShareResult> {
  try {
    let blob: Blob;
    if (typeof source === "string") {
      const res = await fetch(source, { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      blob = await res.blob();
    } else {
      blob = source;
    }
    const file = new File([blob], filename, { type: blob.type || "image/png" });

    const nav = navigator as Navigator & { canShare?: (data?: unknown) => boolean };
    if (typeof navigator.share === "function" && nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: caption });
      return "shared";
    }

    // Fallback desktop: salin caption + unduh gambar
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      // clipboard bisa gagal tanpa izin — abaikan
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return "fallback";
  } catch {
    return "error";
  }
}

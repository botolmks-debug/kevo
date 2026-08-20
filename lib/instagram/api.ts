export async function publishImage(opts: {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}) {
  // Step 1: buat container media
  const containerRes = await fetch(
    `${GRAPH}/${opts.igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        access_token: opts.accessToken,
        image_url: opts.imageUrl,
        caption: opts.caption.slice(0, 2200),
      }).toString(),
      cache: "no-store",
    }
  );
  const containerJson = await containerRes.json();
  console.log("[IG publishImage] container:", JSON.stringify(containerJson));
  if (!containerRes.ok || containerJson.error) {
    throw new Error(containerJson?.error?.message || `Gagal buat container: ${containerRes.status}`);
  }
  const containerId = containerJson.id;
  if (!containerId) throw new Error(`Container ID tidak ada: ${JSON.stringify(containerJson)}`);

  // Step 2: tunggu container siap
  for (let i = 0; i < 10; i++) {
    const st = await graphGet(`/${containerId}`, opts.accessToken, { fields: "status_code" });
    console.log("[IG publishImage] status:", st.status_code);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("Instagram gagal memproses gambar");
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Step 3: publish
  const pubRes = await fetch(
    `${GRAPH}/${opts.igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        access_token: opts.accessToken,
        creation_id: containerId,
      }).toString(),
      cache: "no-store",
    }
  );
  const pubJson = await pubRes.json();
  console.log("[IG publishImage] publish:", JSON.stringify(pubJson));
  if (!pubRes.ok || pubJson.error) {
    throw new Error(pubJson?.error?.message || `Gagal publish: ${pubRes.status}`);
  }
  return { mediaId: pubJson.id };
}
/* eslint-disable */
// ============================================================
// SAM WORKER — "Pilih Objek" di editor (gratis, jalan di browser user).
// Model: SlimSAM (Segment Anything versi ringan) via transformers.js.
// - Library dimuat dari CDN jsDelivr, bobot model dari Hugging Face.
//   Pertama kali dipakai: unduh ±15-30MB, setelah itu tersimpan di cache
//   browser (Cache API) jadi berikutnya cepat.
// - Protokol pesan:
//   → { type: "load", url }                 : siapkan model + "pahami" gambar
//   ← { type: "status", status, progress? } : loading-model | encoding
//   ← { type: "ready", width, height }      : siap diklik
//   → { type: "decode", points, labels }    : points = [[x,y]] 0..1 (relatif gambar),
//                                             labels = 1 (tambah) / 0 (kurangi)
//   ← { type: "mask", mask, width, height } : Uint8Array 0/1 ukuran asli gambar
//   ← { type: "error", message }
// ============================================================
import {
  SamModel,
  AutoProcessor,
  RawImage,
  Tensor,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";

env.allowLocalModels = false;

const MODEL_ID = "Xenova/slimsam-77-uniform";

let model = null;
let processor = null;
let imageInputs = null;
let imageEmbeddings = null;
let busy = false;
let pendingDecode = null;

async function ensureModel() {
  if (model && processor) return;
  self.postMessage({ type: "status", status: "loading-model", progress: 0 });
  const progress_callback = (p) => {
    if (p && p.status === "progress" && typeof p.progress === "number") {
      self.postMessage({ type: "status", status: "loading-model", progress: Math.round(p.progress) });
    }
  };
  // quantized (q8) = ukuran kecil, cukup akurat untuk seleksi objek.
  model = await SamModel.from_pretrained(MODEL_ID, { dtype: "q8", device: "wasm", progress_callback });
  processor = await AutoProcessor.from_pretrained(MODEL_ID, { progress_callback });
}

async function handleLoad(url) {
  await ensureModel();
  self.postMessage({ type: "status", status: "encoding" });
  const image = await RawImage.read(url);
  imageInputs = await processor(image);
  imageEmbeddings = await model.get_image_embeddings(imageInputs);
  const [h, w] = imageInputs.original_sizes[0];
  self.postMessage({ type: "ready", width: w, height: h });
}

async function handleDecode(points, labels) {
  if (!imageInputs || !imageEmbeddings) return;
  const reshaped = imageInputs.reshaped_input_sizes[0]; // [h, w]
  const pts = points.map((p) => [p[0] * reshaped[1], p[1] * reshaped[0]]);
  const input_points = new Tensor("float32", pts.flat(), [1, 1, pts.length, 2]);
  const input_labels = new Tensor("int64", labels.map((l) => BigInt(l)), [1, 1, labels.length]);

  const outputs = await model({ ...imageEmbeddings, input_points, input_labels });
  const masks = await processor.post_process_masks(
    outputs.pred_masks,
    imageInputs.original_sizes,
    imageInputs.reshaped_input_sizes,
  );
  const m = masks[0]; // dims [1, 3, H, W]
  const H = m.dims[2];
  const W = m.dims[3];
  const scores = outputs.iou_scores.data; // 3 kandidat
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
  const plane = H * W;
  const out = new Uint8Array(plane);
  out.set(m.data.subarray(best * plane, (best + 1) * plane));
  self.postMessage({ type: "mask", mask: out, width: W, height: H, score: scores[best] }, [out.buffer]);
}

async function pump() {
  // Klik cepat beruntun: cukup proses klik TERAKHIR (yang lama dibuang).
  while (pendingDecode && !busy) {
    const job = pendingDecode;
    pendingDecode = null;
    busy = true;
    try {
      await handleDecode(job.points, job.labels);
    } catch (err) {
      self.postMessage({ type: "error", message: String((err && err.message) || err) });
    } finally {
      busy = false;
    }
  }
}

self.onmessage = async (e) => {
  const msg = e.data || {};
  if (msg.type === "load") {
    busy = true;
    try {
      imageInputs = null;
      imageEmbeddings = null;
      await handleLoad(msg.url);
    } catch (err) {
      self.postMessage({ type: "error", message: String((err && err.message) || err) });
    } finally {
      busy = false;
      pump();
    }
  } else if (msg.type === "decode") {
    pendingDecode = { points: msg.points, labels: msg.labels };
    pump();
  }
};

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FileButton } from "@/components/ui/FileButton";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import {
  buildBusinessProfile,
  toggleSocialSelection,
  type ContentGoal,
  type ToneOfVoice,
} from "@/lib/onboarding/businessProfile";
import { MAX_SELECTED_SOCIALS, SOCIAL_PLATFORMS } from "@/lib/social/platforms";

const TOTAL_STEPS = 6;

const CONTENT_GOALS: { id: ContentGoal; label: string }[] = [
  { id: "jualan", label: "Jualan" },
  { id: "brand_awareness", label: "Brand awareness" },
  { id: "edukasi", label: "Edukasi" },
  { id: "loyalitas_pelanggan", label: "Loyalitas pelanggan" },
];

const TONES: { id: ToneOfVoice; label: string }[] = [
  { id: "santai", label: "Santai" },
  { id: "profesional", label: "Profesional" },
  { id: "hangat", label: "Hangat" },
  { id: "lucu", label: "Lucu" },
  { id: "formal", label: "Formal" },
];

/** Validasi per step — kembalikan pesan error atau null kalau valid */
function validateStep(
  step: number,
  business: { name: string; industry: string; age: string; location: string },
  offering: { mainProducts: string; flagshipProduct: string; targetCustomer: string; customerProblem: string; priceRange: string },
  positioning: { differentiator: string; contentGoals: ContentGoal[]; tone: ToneOfVoice | ""; cta: string; avoid: string },
  socialValues: Record<string, string>,
  selectedSocialIds: string[],
  story: string,
): string | null {
  switch (step) {
    case 1:
      if (!business.name.trim()) return "Nama bisnis wajib diisi.";
      if (!business.industry.trim()) return "Jenis usaha wajib diisi.";
      if (!business.location.trim()) return "Lokasi wajib diisi.";
      return null;
    case 2:
      if (!offering.mainProducts.trim()) return "Produk/jasa utama wajib diisi.";
      if (!offering.targetCustomer.trim()) return "Target pelanggan wajib diisi.";
      if (!offering.customerProblem.trim()) return "Masalah pelanggan yang dipecahkan wajib diisi.";
      return null;
    case 3:
      if (!positioning.differentiator.trim()) return "Keunggulan/pembeda wajib diisi.";
      if (positioning.contentGoals.length === 0) return "Pilih minimal satu tujuan konten.";
      if (!positioning.tone) return "Pilih nada komunikasi yang diinginkan.";
      if (!positioning.cta.trim()) return "CTA/cara memesan wajib diisi.";
      return null;
    case 4: {
      const filledSocials = SOCIAL_PLATFORMS.filter((p) => (socialValues[p.id] ?? "").trim().length > 0);
      if (filledSocials.length === 0) return "Isi minimal satu akun sosial media.";
      if (selectedSocialIds.length === 0) return "Centang minimal satu sosial media untuk ditampilkan di konten.";
      return null;
    }
    case 5:
      // Foto opsional — tidak wajib
      return null;
    case 6:
      if (!story.trim()) return "Cerita usaha wajib diisi — ini membantu AI membuat konten yang lebih personal.";
      return null;
    default:
      return null;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [business, setBusiness] = useState({ name: "", industry: "", age: "", location: "" });
  const [offering, setOffering] = useState({
    mainProducts: "",
    flagshipProduct: "",
    priceRange: "",
    targetCustomer: "",
    customerProblem: "",
  });
  const [positioning, setPositioning] = useState({
    differentiator: "",
    contentGoals: [] as ContentGoal[],
    tone: "" as ToneOfVoice | "",
    cta: "",
    avoid: "",
  });
  const [socialValues, setSocialValues] = useState<Record<string, string>>({});
  const [selectedSocialIds, setSelectedSocialIds] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [story, setStory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    return () => { previews.forEach((url) => URL.revokeObjectURL(url)); };
  }, [previews]);

  // Reset error validasi tiap kali step berubah
  useEffect(() => { setValidationError(null); }, [step]);

  function handleFilesChange(files: FileList | null) {
    if (!files) return;
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(Array.from(files).map((file) => URL.createObjectURL(file)));
  }

  function toggleContentGoal(goal: ContentGoal) {
    setPositioning((p) => ({
      ...p,
      contentGoals: p.contentGoals.includes(goal)
        ? p.contentGoals.filter((g) => g !== goal)
        : [...p.contentGoals, goal],
    }));
  }

  function toggleSocial(platformId: string) {
    setSelectedSocialIds((selected) => toggleSocialSelection(selected, platformId));
  }

  async function handleNext() {
    // Validasi step saat ini sebelum lanjut
    const error = validateStep(step, business, offering, positioning, socialValues, selectedSocialIds, story);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    // Step terakhir — simpan
    const profile = buildBusinessProfile({
      business,
      offering,
      positioning,
      socials: { values: socialValues, selectedPlatformIds: selectedSocialIds },
      story,
    });

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/business-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Gagal menyimpan profil bisnis.");
      router.push("/dashboard");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Gagal menyimpan profil bisnis.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <div>
        <p className="text-sm font-medium text-primary">Langkah {step}/{TOTAL_STEPS}</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface">
          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        {step === 1 ? (
          <>
            <h1 className="text-xl font-bold text-navy">Ceritakan tentang bisnis Anda</h1>
            <Input label="Nama bisnis *" value={business.name}
              onChange={(e) => setBusiness((b) => ({ ...b, name: e.target.value }))}
              placeholder="mis. Klinik Sehat Sentosa" />
            <Input label="Jenis usaha / industri *" value={business.industry}
              onChange={(e) => setBusiness((b) => ({ ...b, industry: e.target.value }))}
              placeholder="mis. Klinik, kuliner, fashion, jasa" />
            <Input label="Sudah berjalan berapa lama" value={business.age}
              onChange={(e) => setBusiness((b) => ({ ...b, age: e.target.value }))}
              placeholder="mis. 3 tahun, atau: usaha baru" />
            <Input label="Lokasi / area layanan *" value={business.location}
              onChange={(e) => setBusiness((b) => ({ ...b, location: e.target.value }))}
              placeholder="mis. Bandung dan sekitarnya" />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h1 className="text-xl font-bold text-navy">Produk & pelanggan</h1>
            <Input label="Produk/jasa utama *" value={offering.mainProducts}
              onChange={(e) => setOffering((o) => ({ ...o, mainProducts: e.target.value }))}
              placeholder="mis. Konsultasi umum, medical check-up" />
            <Input label="Produk/jasa unggulan" value={offering.flagshipProduct}
              onChange={(e) => setOffering((o) => ({ ...o, flagshipProduct: e.target.value }))}
              placeholder="mis. Paket vaksinasi keluarga" />
            <Input label="Kisaran harga (opsional)" value={offering.priceRange}
              onChange={(e) => setOffering((o) => ({ ...o, priceRange: e.target.value }))}
              placeholder="mis. Rp50.000 - Rp500.000" />
            <Input label="Target pelanggan *" value={offering.targetCustomer}
              onChange={(e) => setOffering((o) => ({ ...o, targetCustomer: e.target.value }))}
              placeholder="mis. Keluarga muda usia 25-40 tahun" />
            <Textarea label="Masalah pelanggan yang bisnis ini pecahkan *" value={offering.customerProblem}
              onChange={(e) => setOffering((o) => ({ ...o, customerProblem: e.target.value }))}
              placeholder="mis. Susah dapat jadwal periksa cepat tanpa antre lama" />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h1 className="text-xl font-bold text-navy">Pembeda & gaya pesan</h1>
            <Textarea label="Keunggulan / pembeda dari pesaing *" value={positioning.differentiator}
              onChange={(e) => setPositioning((p) => ({ ...p, differentiator: e.target.value }))}
              placeholder="mis. Dokter berpengalaman, hasil lab keluar hari yang sama" />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Tujuan utama konten * (boleh lebih dari satu)</span>
              <div className="flex flex-wrap gap-3">
                {CONTENT_GOALS.map((goal) => (
                  <label key={goal.id} className="flex items-center gap-2 text-sm text-navy">
                    <input type="checkbox" checked={positioning.contentGoals.includes(goal.id)}
                      onChange={() => toggleContentGoal(goal.id)} />
                    {goal.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Nada komunikasi yang diinginkan *</span>
              <div className="flex flex-wrap gap-3">
                {TONES.map((tone) => (
                  <label key={tone.id} className="flex items-center gap-2 text-sm text-navy">
                    <input type="radio" name="tone" checked={positioning.tone === tone.id}
                      onChange={() => setPositioning((p) => ({ ...p, tone: tone.id }))} />
                    {tone.label}
                  </label>
                ))}
              </div>
            </div>
            <Textarea label="Ajakan (CTA) yang biasa dipakai + cara menghubungi *" value={positioning.cta}
              onChange={(e) => setPositioning((p) => ({ ...p, cta: e.target.value }))}
              placeholder="mis. 'Daftar sekarang', pesan lewat WhatsApp" />
            <Textarea label="Hal yang harus dihindari (opsional)" value={positioning.avoid}
              onChange={(e) => setPositioning((p) => ({ ...p, avoid: e.target.value }))}
              placeholder="mis. Jangan klaim 'menyembuhkan', hindari kata 'termurah'" />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h1 className="text-xl font-bold text-navy">Sosial media</h1>
            <p className="text-sm text-navy/60">
              Isi minimal satu akun, lalu centang mana yang ingin tampil di konten (maks {MAX_SELECTED_SOCIALS}).
              Dipilih: {selectedSocialIds.length}/{MAX_SELECTED_SOCIALS}.
            </p>
            <div className="flex flex-col gap-3">
              {SOCIAL_PLATFORMS.map((platform) => {
                const value = socialValues[platform.id] ?? "";
                const isSelected = selectedSocialIds.includes(platform.id);
                const selectDisabled = value.trim().length === 0 || (!isSelected && selectedSocialIds.length >= MAX_SELECTED_SOCIALS);
                return (
                  <div key={platform.id} className="flex items-end gap-3">
                    <div className="flex-1">
                      <Input label={platform.label} value={value}
                        onChange={(e) => setSocialValues((v) => ({ ...v, [platform.id]: e.target.value }))}
                        placeholder="Opsional" />
                    </div>
                    <label className="flex items-center gap-1.5 pb-2.5 text-xs text-navy">
                      <input type="checkbox" checked={isSelected} disabled={selectDisabled}
                        onChange={() => toggleSocial(platform.id)} />
                      Tampilkan
                    </label>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <h1 className="text-xl font-bold text-navy">Unggah gambar bisnis (opsional)</h1>
            <p className="text-sm text-navy/60">Logo, foto tempat, atau produk — bisa lebih dari satu. Bisa dilengkapi nanti di Dashboard.</p>
            <FileButton accept="image/*" multiple onChange={(e) => handleFilesChange(e.target.files)} label="Pilih Foto" />
            {previews.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {previews.map((src) => (
                  <img key={src} src={src} alt="" className="h-20 w-20 rounded-card object-cover" />
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {step === 6 ? (
          <>
            <h1 className="text-xl font-bold text-navy">Cerita usaha</h1>
            <Textarea label="Ceritakan usahamu sedetail mungkin *" value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Awal mula, nilai yang dipegang, apa yang bikin bangga, dan apa pun yang penting kami tahu. Makin detail, makin bagus kontennya."
              className="min-h-40" />
          </>
        ) : null}

        {/* Pesan validasi */}
        {validationError ? (
          <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>⚠️</span>
            <span>{validationError}</span>
          </div>
        ) : null}

        {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}

        <div className="mt-2 flex items-center justify-between">
          {step > 1 ? (
            <button type="button" onClick={() => { setValidationError(null); setStep((s) => s - 1); }}
              className="text-sm font-medium text-navy/60 hover:text-navy">
              ← Kembali
            </button>
          ) : <div />}
          <Button type="button" onClick={handleNext} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : step === TOTAL_STEPS ? "Selesai & Mulai" : "Lanjut →"}
          </Button>
        </div>
      </Card>
    </main>
  );
}

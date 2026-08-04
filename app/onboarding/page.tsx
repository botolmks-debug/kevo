"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import {
  buildBusinessProfile,
  toggleSocialSelection,
  type ContentGoal,
  type ToneOfVoice,
} from "@/lib/onboarding/businessProfile";
import { MAX_SELECTED_SOCIALS, SOCIAL_PLATFORMS } from "@/lib/social/platforms";

const TOTAL_STEPS = 5;

const INDUSTRIES = [
  "Makanan & Minuman (F&B)",
  "Fashion",
  "Kecantikan / Skincare",
  "Jasa",
  "Retail / Toko",
  "Kesehatan",
  "Pendidikan",
  "Otomotif",
  "Properti",
  "Teknologi / Software",
  "Kerajinan / Handmade",
];

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

const SELECT_CLASS =
  "rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function validateStep(
  step: number,
  business: { name: string; industry: string; location: string },
  offering: { mainProducts: string; targetCustomer: string; customerProblem: string },
  positioning: { differentiator: string; contentGoals: ContentGoal[]; tone: ToneOfVoice | ""; cta: string },
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

  // age & priceRange & flagshipProduct dihapus dari form; disimpan kosong agar
  // struktur profil tetap valid (BusinessProfile mensyaratkan field-nya ada).
  const [business, setBusiness] = useState({ name: "", industry: "", age: "", location: "" });
  const [industryOther, setIndustryOther] = useState(false);
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
  const [avoidInput, setAvoidInput] = useState("");
  const [socialValues, setSocialValues] = useState<Record<string, string>>({});
  const [selectedSocialIds, setSelectedSocialIds] = useState<string[]>([]);
  const [story, setStory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function onIndustrySelect(v: string) {
    if (v === "__other__") {
      setIndustryOther(true);
      setBusiness((b) => ({ ...b, industry: "" }));
    } else {
      setIndustryOther(false);
      setBusiness((b) => ({ ...b, industry: v }));
    }
  }
  const industrySelectValue = industryOther ? "__other__" : INDUSTRIES.includes(business.industry) ? business.industry : "";

  // Hal yang dihindari sebagai chip/tag (pisah dengan Enter atau koma).
  const avoidTags = positioning.avoid ? positioning.avoid.split(",").map((s) => s.trim()).filter(Boolean) : [];
  function addAvoid(raw: string) {
    const val = raw.trim();
    setAvoidInput("");
    if (!val || avoidTags.includes(val)) return;
    setPositioning((p) => ({ ...p, avoid: [...avoidTags, val].join(", ") }));
  }
  function removeAvoid(idx: number) {
    setPositioning((p) => ({ ...p, avoid: avoidTags.filter((_, i) => i !== idx).join(", ") }));
  }
  function onAvoidKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addAvoid(avoidInput);
    } else if (e.key === "Backspace" && avoidInput === "" && avoidTags.length > 0) {
      removeAvoid(avoidTags.length - 1);
    }
  }

  function toggleContentGoal(goal: ContentGoal) {
    setPositioning((p) => ({
      ...p,
      contentGoals: p.contentGoals.includes(goal) ? p.contentGoals.filter((g) => g !== goal) : [...p.contentGoals, goal],
    }));
  }

  function toggleSocial(platformId: string) {
    setSelectedSocialIds((selected) => toggleSocialSelection(selected, platformId));
  }

  async function handleNext() {
    const error = validateStep(step, business, offering, positioning, socialValues, selectedSocialIds, story);
    if (error) { setValidationError(error); return; }
    setValidationError(null);

    if (step < TOTAL_STEPS) { setStep((s) => s + 1); return; }

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
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Jenis usaha / industri *</span>
              <select value={industrySelectValue} onChange={(e) => onIndustrySelect(e.target.value)} className={SELECT_CLASS}>
                <option value="" disabled>Pilih jenis usaha</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
                <option value="__other__">Lainnya (isi sendiri)</option>
              </select>
            </label>
            {industryOther ? (
              <Input label="Sebutkan jenis usaha *" value={business.industry}
                onChange={(e) => setBusiness((b) => ({ ...b, industry: e.target.value }))}
                placeholder="mis. Event organizer, laundry" />
            ) : null}
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
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">Hal yang harus dihindari (opsional)</span>
              <div className="flex flex-wrap items-center gap-1.5 rounded-card border border-slate-200 bg-white px-3 py-2">
                {avoidTags.map((tag, i) => (
                  <span key={`${tag}-${i}`} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {tag}
                    <button type="button" onClick={() => removeAvoid(i)} className="text-primary/70 hover:text-primary" aria-label="Hapus">×</button>
                  </span>
                ))}
                <input value={avoidInput} onChange={(e) => setAvoidInput(e.target.value)} onKeyDown={onAvoidKey}
                  onBlur={() => addAvoid(avoidInput)}
                  placeholder={avoidTags.length === 0 ? "mis. kata kasar, klaim menyembuhkan (Enter tiap poin)" : "Tambah lagi…"}
                  className="min-w-[8rem] flex-1 bg-transparent text-sm text-navy placeholder:text-slate-400 focus:outline-none" />
              </div>
              <span className="text-xs text-navy/50">Ketik lalu tekan Enter atau koma untuk memisah tiap poin.</span>
            </div>
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
            <h1 className="text-xl font-bold text-navy">Cerita usaha</h1>
            <Textarea label="Ceritakan usahamu sedetail mungkin *" value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Awal mula, nilai yang dipegang, apa yang bikin bangga, dan apa pun yang penting kami tahu. Makin detail, makin bagus kontennya."
              className="min-h-40" />
          </>
        ) : null}

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

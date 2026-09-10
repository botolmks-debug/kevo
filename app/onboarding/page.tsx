"use client";

import { useEffect, Suspense, useState } from "react";
import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import {
  buildBusinessProfile,
  toggleSocialSelection,
  type BusinessProfile,
  type ContentGoal,
  type CustomerType,
  type ToneOfVoice,
} from "@/lib/onboarding/businessProfile";
import { MAX_SELECTED_SOCIALS, SOCIAL_PLATFORMS } from "@/lib/social/platforms";
import { getLang, setLang, type Lang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

const TOTAL_STEPS = 5;

// Nilai yang tersimpan (value/id) TETAP kanonik; hanya tampilan yang diterjemahkan.
const INDUSTRIES: { value: string; en: string }[] = [
  { value: "Makanan & Minuman (F&B)", en: "Food & Beverage (F&B)" },
  { value: "Fashion", en: "Fashion" },
  { value: "Kecantikan / Skincare", en: "Beauty / Skincare" },
  { value: "Jasa", en: "Services" },
  { value: "Retail / Toko", en: "Retail / Store" },
  { value: "Kesehatan", en: "Health" },
  { value: "Pendidikan", en: "Education" },
  { value: "Otomotif", en: "Automotive" },
  { value: "Properti", en: "Property" },
  { value: "Teknologi / Software", en: "Technology / Software" },
  { value: "Kerajinan / Handmade", en: "Crafts / Handmade" },
];

const CONTENT_GOALS: { id: ContentGoal; label: string; en: string }[] = [
  { id: "jualan", label: "Jualan", en: "Sales" },
  { id: "brand_awareness", label: "Brand awareness", en: "Brand awareness" },
  { id: "edukasi", label: "Edukasi", en: "Education" },
  { id: "loyalitas_pelanggan", label: "Loyalitas pelanggan", en: "Customer loyalty" },
];

const TONES: { id: ToneOfVoice; label: string; en: string }[] = [
  { id: "santai", label: "Santai", en: "Casual" },
  { id: "profesional", label: "Profesional", en: "Professional" },
  { id: "hangat", label: "Hangat", en: "Warm" },
  { id: "lucu", label: "Lucu", en: "Funny" },
  { id: "formal", label: "Formal", en: "Formal" },
];

const CUSTOMER_TYPES: { id: CustomerType; label: string; en: string; hint: string; hintEn: string }[] = [
  { id: "b2c", label: "Konsumen langsung (B2C)", en: "Direct consumers (B2C)", hint: "Orang yang pakai sendiri produknya", hintEn: "People who use the product themselves" },
  { id: "b2b", label: "Sesama pebisnis (B2B)", en: "Other businesses (B2B)", hint: "Toko, reseller, atau perusahaan lain yang beli buat dijual/dipakai usaha", hintEn: "Shops, resellers, or other companies buying for resale/business use" },
];

const SELECT_CLASS =
  "rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function validateStep(
  step: number,
  business: { name: string; industry: string; location: string },
  offering: { mainProducts: string; targetCustomer: string; customerTypes: CustomerType[]; customerProblem: string },
  positioning: { differentiator: string; contentGoals: ContentGoal[]; tone: ToneOfVoice | ""; cta: string },
  socialValues: Record<string, string>,
  selectedSocialIds: string[],
  story: string,
  lang: Lang,
): string | null {
  const L = (id: string, en: string) => (lang === "en" ? en : id);
  // HANYA 3 field yang benar-benar wajib: nama, jenis usaha, produk utama.
  // Semua field lain (lokasi, target pelanggan, pembeda, tone, CTA, cerita,
  // sosmed, dll) OPSIONAL — bisa dilewati & diisi belakangan lewat
  // pengaturan profil bisnis, supaya onboarding tidak terasa seperti sensus
  // (keluhan user 10 Sep 2026). Field yang dikosongkan tetap tersimpan
  // sebagai string kosong — sudah aman secara tipe (lihat BusinessProfile).
  switch (step) {
    case 1:
      if (!business.name.trim()) return L("Nama bisnis wajib diisi.", "Business name is required.");
      if (!business.industry.trim()) return L("Jenis usaha wajib diisi.", "Business type is required.");
      return null;
    case 2:
      if (!offering.mainProducts.trim()) return L("Produk/jasa utama wajib diisi.", "Main product/service is required.");
      return null;
    case 3:
      return null;
    case 4:
      return null;
    case 5:
      return null;
    default:
      return null;
  }
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingForm />
    </Suspense>
  );
}

function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lang, setLangLocal] = useState<Lang>("en");
  useEffect(() => setLangLocal(getLang()), []);
  const L = (id: string, en: string) => (lang === "en" ? en : id);

  function chooseLang(next: Lang) {
    if (next === lang) return;
    setLang(next);
    setLangLocal(next);
    setValidationError(null); // hindari pesan error tersisa di bahasa lama
  }

  // age & priceRange & flagshipProduct dihapus dari form; disimpan kosong agar
  // struktur profil tetap valid (BusinessProfile mensyaratkan field-nya ada).
  const [business, setBusiness] = useState({ name: "", industry: "", age: "", location: "" });
  const [industryOther, setIndustryOther] = useState(false);
  const [offering, setOffering] = useState({
    mainProducts: "",
    flagshipProduct: "",
    priceRange: "",
    targetCustomer: "",
    customerTypes: [] as CustomerType[],
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const searchParams = useSearchParams();

  // Mode edit ("Profil Bisnis" di navbar, ?edit=1): muat profil YANG SUDAH
  // ADA supaya form terisi lagi, bukan kosong — user bisa lengkapi field
  // yang tadinya dilewati saat onboarding pertama, atau ubah yang sudah ada.
  useEffect(() => {
    if (searchParams.get("edit") !== "1") return;
    setIsEditMode(true);
    setIsLoadingProfile(true);
    fetch("/api/business-profile")
      .then((res) => res.json())
      .then((data: { profile?: BusinessProfile | null }) => {
        const p = data?.profile;
        if (!p) return; // belum ada profil tersimpan -> form tetap kosong, wajar utk user yg belum onboarding
        setBusiness({ name: p.business.name, industry: p.business.industry, age: p.business.age, location: p.business.location });
        setIndustryOther(!INDUSTRIES.some((i) => i.value === p.business.industry) && p.business.industry.trim().length > 0);
        setOffering({
          mainProducts: p.offering.mainProducts,
          flagshipProduct: p.offering.flagshipProduct,
          priceRange: p.offering.priceRange,
          targetCustomer: p.offering.targetCustomer,
          customerTypes: p.offering.customerTypes,
          customerProblem: p.offering.customerProblem,
        });
        setPositioning({
          differentiator: p.positioning.differentiator,
          contentGoals: p.positioning.contentGoals,
          tone: p.positioning.tone,
          cta: p.positioning.cta,
          avoid: p.positioning.avoid,
        });
        const values: Record<string, string> = {};
        for (const entry of p.socials.entries) values[entry.platformId] = entry.value;
        setSocialValues(values);
        setSelectedSocialIds(p.socials.selectedPlatformIds);
        setStory(p.story);
      })
      .catch(() => {
        // best-effort — kalau gagal muat, form tetap kosong, user masih bisa isi manual
      })
      .finally(() => setIsLoadingProfile(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onIndustrySelect(v: string) {
    if (v === "__other__") {
      setIndustryOther(true);
      setBusiness((b) => ({ ...b, industry: "" }));
    } else {
      setIndustryOther(false);
      setBusiness((b) => ({ ...b, industry: v }));
    }
  }
  const industrySelectValue = industryOther ? "__other__" : INDUSTRIES.some((i) => i.value === business.industry) ? business.industry : "";

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

  function toggleCustomerType(ct: CustomerType) {
    setOffering((o) => ({
      ...o,
      customerTypes: o.customerTypes.includes(ct) ? o.customerTypes.filter((x) => x !== ct) : [...o.customerTypes, ct],
    }));
  }

  function toggleSocial(platformId: string) {
    setSelectedSocialIds((selected) => toggleSocialSelection(selected, platformId));
  }

  async function handleNext() {
    const error = validateStep(step, business, offering, positioning, socialValues, selectedSocialIds, story, lang);
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
      if (!res.ok) throw new Error(data?.error ?? L("Gagal menyimpan profil bisnis.", "Failed to save business profile."));
      router.push(isEditMode ? "/dashboard" : "/gambar"); // edit: balik ke dashboard; user baru: lanjut Upload Produk (alur baru 14 Agu)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : L("Gagal menyimpan profil bisnis.", "Failed to save business profile."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoutOnboarding() {
    const ok = window.confirm(
      lang === "en"
        ? "Log out and use a different account? Your onboarding progress won't be saved."
        : "Keluar dan pakai akun lain? Progres onboarding belum tersimpan.",
    );
    if (!ok) return;
    try {
      await createClient().auth.signOut();
    } catch {}
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12">
      {/* Popup sambutan: jelaskan TUJUAN pertanyaan onboarding (komponen sudah
          lama dibuat tapi belum pernah di-mount — akar bug "popup tidak muncul").
          Tidak relevan lagi kalau user cuma mau EDIT profil yang sudah ada. */}
      {!isEditMode ? <OnboardingWelcome /> : null}
      {isLoadingProfile ? (
        <Card className="flex items-center justify-center py-12 text-sm text-navy/50">
          {L("Memuat profil bisnis...", "Loading business profile...")}
        </Card>
      ) : (
      <>
      {isEditMode ? (
        <p className="text-sm text-navy/60">
          {L("Mengedit profil bisnis yang sudah ada — lengkapi atau ubah bagian mana pun, lalu simpan.", "Editing your existing business profile — fill in or change any part, then save.")}
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-primary">{L("Langkah", "Step")} {step}/{TOTAL_STEPS}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-surface">
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-navy/70">{lang === "en" ? "Language" : "Bahasa"}</span>
          <div className="flex rounded-full border border-line p-1">
            <button type="button" onClick={() => chooseLang("id")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "id" ? "bg-primary text-white" : "text-navy/60 hover:text-navy"}`}>ID</button>
            <button type="button" onClick={() => chooseLang("en")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "en" ? "bg-primary text-white" : "text-navy/60 hover:text-navy"}`}>EN</button>
          </div>
          <button type="button" onClick={handleLogoutOnboarding}
            className="rounded-full px-3 py-1 text-xs font-semibold text-navy/50 transition hover:bg-navy/5 hover:text-navy">
            {lang === "en" ? "Log out" : "Keluar"}
          </button>
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        {step === 1 ? (
          <>
            <h1 className="text-xl font-bold text-navy">{L("Ceritakan tentang bisnis Anda", "Tell us about your business")}</h1>
            <Input label={L("Nama bisnis *", "Business name *")} value={business.name}
              onChange={(e) => setBusiness((b) => ({ ...b, name: e.target.value }))}
              placeholder={L("mis. Klinik Sehat Sentosa", "e.g. Sentosa Health Clinic")} />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">{L("Jenis usaha / industri *", "Business type / industry *")}</span>
              <select value={industrySelectValue} onChange={(e) => onIndustrySelect(e.target.value)} className={SELECT_CLASS}>
                <option value="" disabled>{L("Pilih jenis usaha", "Select business type")}</option>
                {INDUSTRIES.map((i) => (
                  <option key={i.value} value={i.value}>{lang === "en" ? i.en : i.value}</option>
                ))}
                <option value="__other__">{L("Lainnya (isi sendiri)", "Other (type your own)")}</option>
              </select>
            </label>
            {industryOther ? (
              <Input label={L("Sebutkan jenis usaha *", "Specify your business type *")} value={business.industry}
                onChange={(e) => setBusiness((b) => ({ ...b, industry: e.target.value }))}
                placeholder={L("mis. Event organizer, laundry", "e.g. Event organizer, laundry")} />
            ) : null}
            <Input label={L("Lokasi / area layanan (opsional)", "Location / service area (optional)")} value={business.location}
              onChange={(e) => setBusiness((b) => ({ ...b, location: e.target.value }))}
              placeholder={L("mis. Bandung dan sekitarnya", "e.g. Bandung and surrounding areas")} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h1 className="text-xl font-bold text-navy">{L("Produk & pelanggan", "Products & customers")}</h1>
            <Input label={L("Produk/jasa utama *", "Main product/service *")} value={offering.mainProducts}
              onChange={(e) => setOffering((o) => ({ ...o, mainProducts: e.target.value }))}
              placeholder={L("mis. Konsultasi umum, medical check-up", "e.g. General consultation, medical check-up")} />
            <Input label={L("Target pelanggan (opsional)", "Target customers (optional)")} value={offering.targetCustomer}
              onChange={(e) => setOffering((o) => ({ ...o, targetCustomer: e.target.value }))}
              placeholder={L("mis. Keluarga muda usia 25-40 tahun", "e.g. Young families aged 25-40")} />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">{L("Target pelanggan kamu lebih ke (opsional, boleh pilih lebih dari satu)", "Your target customers are mostly (optional, pick one or more)")}</span>
              <div className="flex flex-col gap-2">
                {CUSTOMER_TYPES.map((ct) => (
                  <label key={ct.id} className="flex items-start gap-2 text-sm text-navy">
                    <input type="checkbox" className="mt-0.5" checked={offering.customerTypes.includes(ct.id)}
                      onChange={() => toggleCustomerType(ct.id)} />
                    <span className="flex flex-col">
                      <span>{lang === "en" ? ct.en : ct.label}</span>
                      <span className="text-xs text-navy/50">{lang === "en" ? ct.hintEn : ct.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <Textarea label={L("Masalah pelanggan yang bisnis ini pecahkan (opsional)", "The customer problem this business solves (optional)")} value={offering.customerProblem}
              onChange={(e) => setOffering((o) => ({ ...o, customerProblem: e.target.value }))}
              placeholder={L("mis. Susah dapat jadwal periksa cepat tanpa antre lama", "e.g. Hard to get a quick appointment without long queues")} />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h1 className="text-xl font-bold text-navy">{L("Pembeda & gaya pesan", "Differentiator & messaging")}</h1>
            <Textarea label={L("Keunggulan / pembeda dari pesaing (opsional)", "Your edge / what sets you apart from competitors (optional)")} value={positioning.differentiator}
              onChange={(e) => setPositioning((p) => ({ ...p, differentiator: e.target.value }))}
              placeholder={L("mis. Dokter berpengalaman, hasil lab keluar hari yang sama", "e.g. Experienced doctors, same-day lab results")} />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">{L("Tujuan utama konten (opsional, boleh lebih dari satu)", "Main content goals (optional, pick one or more)")}</span>
              <div className="flex flex-wrap gap-3">
                {CONTENT_GOALS.map((goal) => (
                  <label key={goal.id} className="flex items-center gap-2 text-sm text-navy">
                    <input type="checkbox" checked={positioning.contentGoals.includes(goal.id)}
                      onChange={() => toggleContentGoal(goal.id)} />
                    {lang === "en" ? goal.en : goal.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">{L("Nada komunikasi yang diinginkan (opsional)", "Preferred tone of voice (optional)")}</span>
              <div className="flex flex-wrap gap-3">
                {TONES.map((tone) => (
                  <label key={tone.id} className="flex items-center gap-2 text-sm text-navy">
                    <input type="radio" name="tone" checked={positioning.tone === tone.id}
                      onChange={() => setPositioning((p) => ({ ...p, tone: tone.id }))} />
                    {lang === "en" ? tone.en : tone.label}
                  </label>
                ))}
              </div>
            </div>
            <Textarea label={L("Ajakan (CTA) yang biasa dipakai + cara menghubungi (opsional)", "Your usual call to action (CTA) + how to reach you (optional)")} value={positioning.cta}
              onChange={(e) => setPositioning((p) => ({ ...p, cta: e.target.value }))}
              placeholder={L("mis. 'Daftar sekarang', pesan lewat WhatsApp", "e.g. 'Sign up now', order via WhatsApp")} />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-navy">{L("Hal yang harus dihindari (opsional)", "Things to avoid (optional)")}</span>
              <div className="flex flex-wrap items-center gap-1.5 rounded-card border border-slate-200 bg-white px-3 py-2">
                {avoidTags.map((tag, i) => (
                  <span key={`${tag}-${i}`} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {tag}
                    <button type="button" onClick={() => removeAvoid(i)} className="text-primary/70 hover:text-primary" aria-label={L("Hapus", "Remove")}>×</button>
                  </span>
                ))}
                <input value={avoidInput} onChange={(e) => setAvoidInput(e.target.value)} onKeyDown={onAvoidKey}
                  onBlur={() => addAvoid(avoidInput)}
                  placeholder={avoidTags.length === 0 ? L("mis. kata kasar, klaim menyembuhkan (Enter tiap poin)", "e.g. profanity, cure claims (Enter after each)") : L("Tambah lagi…", "Add more…")}
                  className="min-w-[8rem] flex-1 bg-transparent text-sm text-navy placeholder:text-slate-400 focus:outline-none" />
              </div>
              <span className="text-xs text-navy/50">{L("Ketik lalu tekan Enter atau koma untuk memisah tiap poin.", "Type then press Enter or comma to separate each item.")}</span>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h1 className="text-xl font-bold text-navy">{L("Sosial media (opsional)", "Social media (optional)")}</h1>
            <p className="text-sm text-navy/60">
              {L("Boleh dilewati dan diisi nanti. Kalau diisi, centang mana yang ingin tampil di konten", "Can be skipped and filled in later. If filled, check which ones to show on your content")} ({L("maks", "max")} {MAX_SELECTED_SOCIALS}).{" "}
              {L("Dipilih", "Selected")}: {selectedSocialIds.length}/{MAX_SELECTED_SOCIALS}.
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
                        placeholder={L("Opsional", "Optional")} />
                    </div>
                    <label className="flex items-center gap-1.5 pb-2.5 text-xs text-navy">
                      <input type="checkbox" checked={isSelected} disabled={selectDisabled}
                        onChange={() => toggleSocial(platform.id)} />
                      {L("Tampilkan", "Show")}
                    </label>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 5 ? (
          <>
            <h1 className="text-xl font-bold text-navy">{L("Cerita usaha (opsional)", "Your story (optional)")}</h1>
            <Textarea label={L("Ceritakan usahamu sedetail mungkin (opsional)", "Tell your story in as much detail as possible (optional)")} value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder={L("Awal mula, nilai yang dipegang, apa yang bikin bangga, dan apa pun yang penting kami tahu. Makin detail, makin bagus kontennya.", "How it started, the values you hold, what makes you proud, and anything important we should know. The more detail, the better the content.")}
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
              {L("← Kembali", "← Back")}
            </button>
          ) : <div />}
          <Button type="button" onClick={handleNext} disabled={isSaving}>
            {isSaving ? L("Menyimpan...", "Saving...") : step === TOTAL_STEPS ? L("Selesai & Mulai", "Finish & Start") : L("Lanjut →", "Next →")}
          </Button>
        </div>
      </Card>
      </>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  function handleFilesChange(files: FileList | null) {
    if (!files) return;
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(Array.from(files).map((file) => URL.createObjectURL(file)));
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <div>
        <p className="text-sm font-medium text-primary">
          Langkah {step}/{TOTAL_STEPS}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        {step === 1 ? (
          <>
            <h1 className="text-xl font-bold text-navy">Ceritakan tentang bisnis Anda</h1>
            <Input
              label="Nama bisnis"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="mis. Klinik Sehat Sentosa"
            />
            <Input
              label="Jenis usaha"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="mis. Klinik, sekolah, UMKM"
            />
            <Input
              label="Target pelanggan"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="mis. Keluarga muda di sekitar kota"
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h1 className="text-xl font-bold text-navy">Unggah beberapa gambar bisnis</h1>
            <p className="text-sm text-navy/60">
              Logo, foto tempat, atau produk — bisa lebih dari satu.
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesChange(e.target.files)}
              className="text-sm"
            />
            {previews.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {previews.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal, belum diupload
                  <img key={src} src={src} alt="" className="h-20 w-20 rounded-card object-cover" />
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h1 className="text-xl font-bold text-navy">Tautan sosial media</h1>
            <Input
              label="Instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@namabisnis"
            />
            <Input
              label="WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+62 8xx-xxxx-xxxx"
            />
            <Input
              label="Website (opsional)"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
            />
          </>
        ) : null}

        <Button type="button" onClick={handleNext} className="mt-2 self-end">
          Lanjut
        </Button>
      </Card>
    </main>
  );
}

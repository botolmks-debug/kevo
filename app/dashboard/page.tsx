import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ImageLibrary } from "./ImageLibrary";

const comingSoon = [
  { title: "Daftar Konten", description: "Riwayat semua konten yang pernah dibuat." },
  { title: "Editor Tata Letak", description: "Atur ulang posisi & ukuran elemen template." },
];

export default function DashboardPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <Card className="flex flex-col items-start gap-3 bg-navy text-white">
          <h1 className="text-2xl font-bold">Buat Konten Baru</h1>
          <p className="text-white/70">
            Pilih template, isi teks, dan render jadi PNG siap posting.
          </p>
          <LinkButton href="/generate" variant="cta">
            Buat Konten
          </LinkButton>
        </Card>

        <ImageLibrary />

        <section>
          <h2 className="text-lg font-semibold text-navy">Segera Hadir</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {comingSoon.map((item) => (
              <Card key={item.title} className="flex flex-col gap-2 opacity-70">
                <h3 className="font-semibold text-navy">{item.title}</h3>
                <p className="text-sm text-navy/60">{item.description}</p>
                <span className="text-xs font-medium text-primary">Segera hadir</span>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

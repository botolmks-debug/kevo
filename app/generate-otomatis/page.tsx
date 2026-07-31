import { Header } from "@/components/ui/Header";
import { AutoGenerate } from "./AutoGenerate";

export default function GenerateOtomatisPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
        <AutoGenerate />
      </main>
    </>
  );
}

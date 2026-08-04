"use client";

import { Card } from "@/components/ui/Card";
import { ONBOARDING_QUESTIONS } from "@/lib/onboarding/questions";

export function OnboardingQuestions() {
  const groups = Array.from(new Set(ONBOARDING_QUESTIONS.map((q) => q.group)));
  const total = ONBOARDING_QUESTIONS.length;

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-navy">Pertanyaan Onboarding ({total})</h2>
        <p className="text-sm text-navy/60">
          Daftar ini otomatis mengikuti <code className="rounded bg-navy/5 px-1">lib/onboarding/questions.ts</code>. Ubah di sana → panel ini ikut berubah.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-navy/50">{g}</h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {ONBOARDING_QUESTIONS.filter((q) => q.group === g).map((q) => (
                <li key={q.field} className="flex flex-col rounded-xl border border-line px-3 py-2">
                  <span className="text-sm font-medium text-navy">
                    {q.label}
                    {q.input ? <span className="font-normal text-navy/40"> · {q.input}</span> : null}
                  </span>
                  <span className="text-xs text-navy/40">{q.field}</span>
                  {q.note ? <span className="mt-0.5 text-xs text-primary">{q.note}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

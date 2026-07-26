import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClassName =
  "rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function slugify(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Input({ label, id, className, ...props }: InputProps) {
  const inputId = id ?? slugify(label);
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-navy">{label}</span>
      <input id={inputId} className={[fieldClassName, className].filter(Boolean).join(" ")} {...props} />
    </label>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };

export function Textarea({ label, id, className, ...props }: TextareaProps) {
  const inputId = id ?? slugify(label);
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-navy">{label}</span>
      <textarea
        id={inputId}
        className={["min-h-24", fieldClassName, className].filter(Boolean).join(" ")}
        {...props}
      />
    </label>
  );
}

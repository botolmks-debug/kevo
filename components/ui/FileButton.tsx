import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type FileButtonProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Teks pada tombol (default "Pilih File"). */
  label?: ReactNode;
  variant?: "primary" | "secondary";
};

/**
 * Tombol upload file yang rapi — menggantikan tampilan default browser
 * ("Choose File / No file chosen"). Input file asli disembunyikan di dalam
 * <label>, jadi klik tombol tetap membuka dialog file. Semua prop input
 * (accept, multiple, onChange, dll) diteruskan seperti biasa.
 */
export const FileButton = forwardRef<HTMLInputElement, FileButtonProps>(function FileButton(
  { label = "Pilih File", variant = "secondary", className = "", ...inputProps },
  ref,
) {
  const base =
    "inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-primary text-white hover:bg-primary/90"
      : "border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10";

  return (
    <label className={`${base} ${styles} ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M17 8l-5-5-5 5" />
        <path d="M12 3v12" />
      </svg>
      <span>{label}</span>
      <input type="file" className="hidden" ref={ref} {...inputProps} />
    </label>
  );
});

import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "rounded-[20px] border border-line bg-white p-6 shadow-[0_1px_2px_rgba(40,40,38,0.04),0_10px_30px_-15px_rgba(40,40,38,0.15)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
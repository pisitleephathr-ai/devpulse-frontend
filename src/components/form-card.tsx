import { cn } from "@/lib/utils";

/** White card container used to wrap form fields. */
export function FormCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Field wrapper: label (with optional hint) + control + validation error. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[12.5px] font-medium text-zinc-900">
        {label}
        {hint && <span className="font-normal text-zinc-400"> — {hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11.5px] text-red-600">{error}</p>}
    </div>
  );
}

/** Right-aligned form action row. */
export function FormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-2.5 pt-1">{children}</div>
  );
}

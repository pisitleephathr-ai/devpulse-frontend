"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** input width utility (default w-[180px]) */
  inputClassName?: string;
};

/** Standard search box used in every filter bar. */
export function SearchInput({
  value,
  onChange,
  placeholder = "ค้นหา…",
  className,
  inputClassName = "w-[180px]",
}: SearchInputProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-[7px]",
        className
      )}
    >
      <Search className="size-3.5 flex-none text-zinc-400" strokeWidth={2} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "min-w-0 border-none bg-transparent p-0 text-[12.5px] outline-none placeholder:text-zinc-400",
          inputClassName
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="ล้างการค้นหา"
          className="flex-none text-zinc-400 hover:text-zinc-600"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

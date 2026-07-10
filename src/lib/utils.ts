import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Short Thai relative time, e.g. "5 นาทีที่แล้ว", "เมื่อวาน". */
export function relativeTimeTh(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.round(h / 24);
  if (d === 1) return "เมื่อวาน";
  if (d < 30) return `${d} วันที่แล้ว`;
  const mo = Math.round(d / 30);
  return `${mo} เดือนที่แล้ว`;
}

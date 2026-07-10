/**
 * Client-side CSV export. Exports exactly the rows passed in (already filtered
 * by the page), so it respects the current filters and the user's RBAC scope —
 * nothing is fetched fresh. A UTF-8 BOM is prepended so Excel opens Thai text
 * correctly.
 */

type Cell = string | number | null | undefined;

function escapeCell(value: Cell): string {
  const s = value == null ? "" : String(value);
  // Collapse newlines inside a field so a cell stays on one row.
  const flat = s.replace(/\r?\n/g, " ").trim();
  return /[",]/.test(flat) ? `"${flat.replace(/"/g, '""')}"` : flat;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Cell[][]
): void {
  const lines = [headers, ...rows].map((r) => r.map(escapeCell).join(","));
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Timestamp suffix for export filenames, e.g. "2026-07-10". */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

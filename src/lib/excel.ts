/**
 * Client-side Excel export — no dependencies.
 *
 * Emits a SpreadsheetML 2003 workbook (.xls) that Excel, Google Sheets and
 * LibreOffice open natively. A UTF-8 declaration (+ BOM) makes Thai text render
 * correctly. Exports exactly the rows passed in (already filtered by the page),
 * so it respects the current filters and the user's RBAC scope — nothing is
 * fetched fresh.
 */

type Cell = string | number | null | undefined;

/** XML-escape a value and keep newlines as in-cell line breaks. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, "&#10;");
}

function cellXml(value: Cell): string {
  if (value == null || value === "") return "<Cell/>";
  if (typeof value === "number" && Number.isFinite(value))
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function rowXml(cells: Cell[]): string {
  return `<Row>${cells.map(cellXml).join("")}</Row>`;
}

/** Excel worksheet names disallow []:*?/\ and are capped at 31 chars. */
function safeSheetName(name: string): string {
  const cleaned = name.replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 31);
  return cleaned || "Sheet1";
}

/**
 * Trigger a browser download of the given table as an Excel (.xls) workbook.
 * `filename` should end in `.xls`.
 */
export function downloadExcel(
  filename: string,
  headers: string[],
  rows: Cell[][],
  sheetName = "Sheet1"
): void {
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"` +
    ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Worksheet ss:Name="${escapeXml(safeSheetName(sheetName))}"><Table>` +
    rowXml(headers) +
    rows.map(rowXml).join("") +
    `</Table></Worksheet></Workbook>`;

  const blob = new Blob(["﻿" + xml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
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

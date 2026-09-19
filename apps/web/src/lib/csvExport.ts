/**
 * Client-side CSV download helpers (Prod P7).
 * Pattern matches Expiry Management: BOM + quoted cells + Latin-digit filenames.
 */

export function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** Local calendar stamp for filenames — Latin digits only (YYYYMMDD). */
export function csvStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Download a CSV file from in-memory rows.
 * First row is typically headers. No-op when `rows` is empty.
 */
export function downloadCsv(filename: string, rows: string[][]): void {
  if (rows.length === 0) return;
  const lines = rows.map((line) => line.map(csvCell).join(","));
  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

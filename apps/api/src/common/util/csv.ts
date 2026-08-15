/** Minimal RFC 4180 CSV serializer — good enough for exporting a bounded row set, no streaming needed at this scale. */
export function toCsv(rows: Array<Record<string, string | number | boolean | null>>, columns: string[]): string {
  const header = columns.map(escapeCsvCell).join(',');
  const body = rows
    .map((row) => columns.map((col) => escapeCsvCell(row[col] ?? '')).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}

function escapeCsvCell(value: string | number | boolean | null): string {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

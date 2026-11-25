/**
 * CSV in and out, in the shape Excel and Google Sheets expect:
 * UTF-8 with a byte-order mark, CRLF line endings, standard quoting.
 */

/** Cells starting with these are read as formulas by spreadsheets; prefix them with ' so they stay text. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** The calendar day in Kampala, as YYYY-MM-DD (dates are stored as Kampala midnight). */
export function kampalaDay(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kampala", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export type Cell = string | number | boolean | Date | null | undefined;

function cellText(v: Cell) {
  if (v == null) return "";
  if (v instanceof Date) return kampalaDay(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  return FORMULA_START.test(s) ? `'${s}` : s;
}

function quote(s: string) {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Cell[][]) {
  return "﻿" + rows.map((r) => r.map((c) => quote(cellText(c))).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]+/g, "-")}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Pick the delimiter used on the header line: comma, semicolon (some Excel locales) or tab. */
function detectDelimiter(text: string) {
  const first = text.slice(0, text.search(/\r?\n/) === -1 ? text.length : text.search(/\r?\n/));
  let best = ",";
  let bestCount = -1;
  for (const d of [",", ";", "\t"]) {
    let n = 0;
    let inQ = false;
    for (const ch of first) {
      if (ch === '"') inQ = !inQ;
      else if (ch === d && !inQ) n++;
    }
    if (n > bestCount) [best, bestCount] = [d, n];
  }
  return best;
}

/** Parse CSV text into rows of trimmed cells. Blank lines are dropped. Undoes the ' formula guard. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const d = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += ch;
    } else if (ch === '"' && cell.trim() === "") {
      cell = "";
      inQ = true;
    } else if (ch === d) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows
    .map((r) => r.map((c) => c.trim().replace(/^'(?=[=+\-@])/, "")))
    .filter((r) => r.some((c) => c !== ""));
}

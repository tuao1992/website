/**
 * Pull GSTIN candidates out of an uploaded CSV / TSV / TXT / XLSX file.
 *
 * If a column header mentions GST, that column is authoritative — every non-blank
 * cell in it becomes a candidate, including malformed ones, so typos surface as
 * "invalid" rows instead of vanishing. Otherwise every cell that is roughly
 * GSTIN-shaped is collected.
 */

import ExcelJS from 'exceljs';
import { normalizeGstin } from '../lib/gstin.js';

/** Cell values that mean "no GSTIN here" rather than "a broken GSTIN". */
const BLANK_PLACEHOLDERS = new Set(['', '-', '--', 'NA', 'N/A', 'NIL', 'NONE', 'NULL', 'TBD']);

const HEADER_RE = /gst\s*(in|no|num|number|identification)?\b|^gstin$/i;

export interface ParsedUpload {
  candidates: string[];
  /** How the candidates were located, shown back to the user. */
  strategy: 'gstin-column' | 'cell-scan';
  /** Header of the column used, when `strategy` is 'gstin-column'. */
  column?: string;
  rowsScanned: number;
  sheets?: string[];
}

function looksLikeGstin(value: string): boolean {
  const normalized = normalizeGstin(value);
  // Wide enough to catch a mistyped 14- or 16-character entry, narrow enough to
  // ignore invoice numbers and phone numbers.
  return normalized.length >= 13 && normalized.length <= 17 && /^[0-9]{2}[A-Z]/.test(normalized);
}

function isBlank(value: string): boolean {
  return BLANK_PLACEHOLDERS.has(value.trim().toUpperCase());
}

function collect(rows: string[][]): ParsedUpload {
  const header = rows[0] ?? [];
  const headerIndex = header.findIndex((cell) => HEADER_RE.test(String(cell ?? '').trim()));

  const seen = new Set<string>();
  const candidates: string[] = [];
  const push = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === '' || isBlank(trimmed)) return;
    const key = normalizeGstin(trimmed);
    if (key === '' || seen.has(key)) return;
    seen.add(key);
    candidates.push(key);
  };

  if (headerIndex >= 0) {
    for (const row of rows.slice(1)) push(String(row[headerIndex] ?? ''));
    return {
      candidates,
      strategy: 'gstin-column',
      column: String(header[headerIndex] ?? '').trim(),
      rowsScanned: Math.max(0, rows.length - 1),
    };
  }

  for (const row of rows) {
    for (const cell of row) {
      const value = String(cell ?? '');
      if (looksLikeGstin(value)) push(value);
    }
  }
  return { candidates, strategy: 'cell-scan', rowsScanned: rows.length };
}

/** Split a delimited line, honouring double-quoted fields. */
function splitDelimited(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i] as string;
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function detectDelimiter(sample: string): string {
  const counts: Array<[string, number]> = [
    [',', (sample.match(/,/g) ?? []).length],
    ['\t', (sample.match(/\t/g) ?? []).length],
    [';', (sample.match(/;/g) ?? []).length],
    ['|', (sample.match(/\|/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  const best = counts[0];
  return best && best[1] > 0 ? best[0] : ',';
}

export function parseTextFile(content: string): ParsedUpload {
  const text = content.replace(/^﻿/, '');
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim() !== '');
  const delimiter = detectDelimiter(lines.slice(0, 10).join('\n'));
  return collect(lines.map((line) => splitDelimited(line, delimiter)));
}

export async function parseWorkbook(buffer: Buffer): Promise<ParsedUpload> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const rows: string[][] = [];
  const sheets: string[] = [];
  workbook.eachSheet((sheet) => {
    sheets.push(sheet.name);
    sheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value;
        if (value === null || value === undefined) {
          cells.push('');
        } else if (typeof value === 'object' && 'text' in value) {
          cells.push(String((value as { text: unknown }).text ?? ''));
        } else if (typeof value === 'object' && 'result' in value) {
          cells.push(String((value as { result: unknown }).result ?? ''));
        } else {
          cells.push(String(value));
        }
      });
      rows.push(cells);
    });
  });

  return { ...collect(rows), sheets };
}

/** Dispatch on file extension / MIME type. */
export async function parseUpload(filename: string, mimetype: string, buffer: Buffer): Promise<ParsedUpload> {
  const lower = filename.toLowerCase();
  const isExcel =
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xlsm') ||
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (isExcel) return parseWorkbook(buffer);
  if (lower.endsWith('.xls')) {
    throw new Error('Legacy .xls files are not supported — re-save the sheet as .xlsx or export it as CSV.');
  }
  return parseTextFile(buffer.toString('utf8'));
}

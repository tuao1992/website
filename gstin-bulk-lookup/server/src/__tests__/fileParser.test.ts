import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parseTextFile, parseUpload, parseWorkbook } from '../services/fileParser.js';

const A = '27AAPFU0939F1ZV';
const B = '09AAACH7409R1ZZ';

describe('parseTextFile', () => {
  it('uses a GSTIN column when the header names one', () => {
    const csv = `Vendor,GSTIN,Invoice\nAlpha,${A},INV-1001\nBeta,${B},INV-1002\n`;
    const parsed = parseTextFile(csv);
    expect(parsed.strategy).toBe('gstin-column');
    expect(parsed.column).toBe('GSTIN');
    expect(parsed.candidates).toEqual([A, B]);
  });

  it('keeps malformed entries from the GSTIN column so they are reported, not dropped', () => {
    const csv = `Vendor,GST No\nAlpha,${A}\nBeta,27AAPFU0939F1Z\n`;
    const parsed = parseTextFile(csv);
    expect(parsed.candidates).toEqual([A, '27AAPFU0939F1Z']);
  });

  it('ignores blank placeholders in the GSTIN column', () => {
    const parsed = parseTextFile(`GSTIN\n${A}\nN/A\n-\n\n`);
    expect(parsed.candidates).toEqual([A]);
  });

  it('scans every cell when no header identifies a column', () => {
    const csv = `Alpha,${A},9876543210\nBeta,${B},1234567890\n`;
    const parsed = parseTextFile(csv);
    expect(parsed.strategy).toBe('cell-scan');
    expect(parsed.candidates).toEqual([A, B]);
  });

  it('handles quoted fields, semicolons and tabs', () => {
    expect(parseTextFile(`GSTIN;Name\n${A};"Alpha, Inc."\n`).candidates).toEqual([A]);
    expect(parseTextFile(`GSTIN\tName\n${A}\tAlpha\n`).candidates).toEqual([A]);
  });

  it('reads a plain newline-separated list', () => {
    expect(parseTextFile(`${A}\n${B}\n`).candidates).toEqual([A, B]);
  });

  it('de-duplicates', () => {
    expect(parseTextFile(`GSTIN\n${A}\n${A}\n${B}\n`).candidates).toEqual([A, B]);
  });
});

async function buildWorkbook(rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Vendors');
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('parseWorkbook', () => {
  it('reads a GSTIN column out of an xlsx sheet', async () => {
    const buffer = await buildWorkbook([
      ['Vendor', 'GSTIN'],
      ['Alpha', A],
      ['Beta', B],
    ]);
    const parsed = await parseWorkbook(buffer);
    expect(parsed.strategy).toBe('gstin-column');
    expect(parsed.candidates).toEqual([A, B]);
    expect(parsed.sheets).toEqual(['Vendors']);
  });
});

describe('parseUpload', () => {
  it('dispatches on extension', async () => {
    const parsed = await parseUpload('list.csv', 'text/csv', Buffer.from(`GSTIN\n${A}\n`));
    expect(parsed.candidates).toEqual([A]);
  });

  it('explains that legacy .xls is unsupported instead of failing obscurely', async () => {
    await expect(parseUpload('old.xls', 'application/vnd.ms-excel', Buffer.from(''))).rejects.toThrow(/re-save/i);
  });
});

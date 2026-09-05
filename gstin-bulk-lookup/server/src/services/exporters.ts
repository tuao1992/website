/** CSV / Excel / PDF / JSON renderers for a completed batch. */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { LookupResult, LookupSummary } from '../types.js';

interface Column {
  key: string;
  header: string;
  width: number;
  get: (result: LookupResult) => string;
}

const STATUS_LABEL: Record<LookupResult['status'], string> = {
  success: 'Found',
  derived: 'Validated only',
  invalid: 'Invalid GSTIN',
  not_found: 'Not found',
  error: 'Lookup failed',
};

const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

/**
 * One flat row per GSTIN. Every column is present for every row — failed lookups
 * come through with blanks plus a populated Message, so a failed entry is never
 * missing from an export.
 */
export const COLUMNS: readonly Column[] = [
  { key: 'input', header: 'Input', width: 20, get: (r) => r.input },
  { key: 'gstin', header: 'GSTIN', width: 20, get: (r) => r.gstin },
  { key: 'status', header: 'Result', width: 14, get: (r) => STATUS_LABEL[r.status] },
  { key: 'legalName', header: 'Legal Name', width: 34, get: (r) => text(r.record?.legalName) },
  { key: 'tradeName', header: 'Trade Name', width: 30, get: (r) => text(r.record?.tradeName) },
  { key: 'gstStatus', header: 'GST Status', width: 14, get: (r) => text(r.record?.status) },
  { key: 'taxpayerType', header: 'Taxpayer Type', width: 20, get: (r) => text(r.record?.taxpayerType) },
  { key: 'constitution', header: 'Constitution of Business', width: 26, get: (r) => text(r.record?.constitutionOfBusiness) },
  { key: 'registrationDate', header: 'Registration Date', width: 18, get: (r) => text(r.record?.registrationDate) },
  { key: 'cancellationDate', header: 'Cancellation Date', width: 18, get: (r) => text(r.record?.cancellationDate) },
  { key: 'lastUpdated', header: 'Last Updated', width: 16, get: (r) => text(r.record?.lastUpdatedDate) },
  { key: 'address', header: 'Registered Address', width: 52, get: (r) => text(r.record?.principalAddress?.formatted) },
  { key: 'buildingName', header: 'Building', width: 22, get: (r) => text(r.record?.principalAddress?.buildingName) },
  { key: 'street', header: 'Street', width: 24, get: (r) => text(r.record?.principalAddress?.street) },
  { key: 'locality', header: 'Locality', width: 20, get: (r) => text(r.record?.principalAddress?.locality) },
  { key: 'city', header: 'City', width: 18, get: (r) => text(r.record?.principalAddress?.city) },
  { key: 'district', header: 'District', width: 18, get: (r) => text(r.record?.principalAddress?.district) },
  { key: 'state', header: 'State', width: 20, get: (r) => text(r.record?.principalAddress?.state ?? r.record?.derived?.stateName) },
  { key: 'stateCode', header: 'State Code', width: 11, get: (r) => text(r.record?.derived?.stateCode) },
  { key: 'pincode', header: 'Pincode', width: 10, get: (r) => text(r.record?.principalAddress?.pincode) },
  { key: 'pan', header: 'PAN', width: 14, get: (r) => text(r.record?.derived?.pan) },
  { key: 'entityType', header: 'PAN Holder Type', width: 26, get: (r) => text(r.record?.derived?.entityType) },
  { key: 'nature', header: 'Nature of Business', width: 34, get: (r) => (r.record?.natureOfBusiness ?? []).join('; ') },
  { key: 'centreJurisdiction', header: 'Centre Jurisdiction', width: 30, get: (r) => text(r.record?.centreJurisdiction) },
  { key: 'stateJurisdiction', header: 'State Jurisdiction', width: 30, get: (r) => text(r.record?.stateJurisdiction) },
  {
    key: 'eInvoice',
    header: 'e-Invoice Enabled',
    width: 16,
    get: (r) => (r.record?.eInvoiceEnabled === null || r.record?.eInvoiceEnabled === undefined ? '' : r.record.eInvoiceEnabled ? 'Yes' : 'No'),
  },
  {
    key: 'additionalPlaces',
    header: 'Additional Places',
    width: 16,
    get: (r) => (r.record ? String(r.record.additionalAddresses.length) : ''),
  },
  { key: 'message', header: 'Message / Error', width: 46, get: (r) => text(r.message) },
  { key: 'code', header: 'Error Code', width: 22, get: (r) => text(r.code) },
  { key: 'verifiedBy', header: 'Verified By', width: 14, get: (r) => text(r.record?.verifiedBy) },
  { key: 'provenance', header: 'Provenance', width: 40, get: (r) => text(r.record?.provenance) },
  { key: 'source', header: 'Source', width: 16, get: (r) => r.source },
  { key: 'cached', header: 'From Cache', width: 12, get: (r) => (r.cached ? 'Yes' : 'No') },
];

function csvCell(value: string): string {
  // Guard against spreadsheet formula injection from provider-supplied text.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function toCsv(results: readonly LookupResult[]): string {
  const header = COLUMNS.map((column) => csvCell(column.header)).join(',');
  const rows = results.map((result) => COLUMNS.map((column) => csvCell(column.get(result))).join(','));
  // BOM so Excel opens UTF-8 business names correctly on Windows.
  return `﻿${[header, ...rows].join('\r\n')}\r\n`;
}

export function toJson(results: readonly LookupResult[], summary: LookupSummary): string {
  return JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2);
}

export async function toXlsx(results: readonly LookupResult[], summary: LookupSummary): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GSTIN Bulk Lookup';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Results', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = COLUMNS.map((column) => ({ header: column.header, key: column.key, width: column.width }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 22;

  const statusFill: Record<LookupResult['status'], string> = {
    success: 'FFEAF7EE',
    derived: 'FFEDF2F9',
    invalid: 'FFFDECEC',
    not_found: 'FFFFF6E5',
    error: 'FFFDECEC',
  };

  for (const result of results) {
    const row = sheet.addRow(Object.fromEntries(COLUMNS.map((column) => [column.key, column.get(result)])));
    row.alignment = { vertical: 'top', wrapText: false };
    if (result.status !== 'success') {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFill[result.status] } };
    }
  }
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 40 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  const rows: Array<[string, string | number]> = [
    ['Generated at', new Date().toISOString()],
    ['Data source', summary.provider],
    ['Total GSTINs', summary.total],
    ['Found', summary.success],
    ['Validated only (no registry)', summary.derived],
    ['Invalid GSTIN', summary.invalid],
    ['Not found', summary.notFound],
    ['Lookup failed', summary.errors],
    ['Served from cache', summary.cached],
    ['Elapsed (ms)', summary.durationMs],
  ];
  for (const [metric, value] of rows) summarySheet.addRow({ metric, value });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Landscape A4 report: summary, a table of key fields, then a failures section. */
export function toPdf(results: readonly LookupResult[], summary: LookupSummary): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const usable = right - left;

    doc.fontSize(18).font('Helvetica-Bold').text('GSTIN Bulk Lookup — Results');
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555')
      .text(
        `Generated ${new Date().toLocaleString('en-IN')}  ·  Source: ${summary.provider}  ·  ` +
          `${summary.total} GSTIN(s): ${summary.success} found, ${summary.derived} validated only, ` +
          `${summary.invalid} invalid, ${summary.notFound} not found, ${summary.errors} failed`,
      );
    doc.fillColor('#000').moveDown(0.8);

    const cols = [
      { header: 'GSTIN', width: 0.13, get: (r: LookupResult) => r.gstin },
      { header: 'Legal Name', width: 0.2, get: (r: LookupResult) => COLUMNS[3]?.get(r) ?? '' },
      { header: 'Status', width: 0.09, get: (r: LookupResult) => STATUS_LABEL[r.status] },
      { header: 'GST Status', width: 0.08, get: (r: LookupResult) => text(r.record?.status) },
      { header: 'Registered Address', width: 0.35, get: (r: LookupResult) => text(r.record?.principalAddress?.formatted) },
      { header: 'Reg. Date', width: 0.09, get: (r: LookupResult) => text(r.record?.registrationDate) },
      { header: 'PAN', width: 0.06, get: (r: LookupResult) => text(r.record?.derived?.pan) },
    ];
    const widths = cols.map((column) => column.width * usable);
    const padding = 4;

    const drawHeader = () => {
      const y = doc.y;
      doc.rect(left, y, usable, 18).fill('#1f3a5f');
      doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
      let x = left;
      cols.forEach((column, i) => {
        doc.text(column.header, x + padding, y + 5, { width: (widths[i] as number) - padding * 2, ellipsis: true });
        x += widths[i] as number;
      });
      doc.fillColor('#000').font('Helvetica').y = y + 18;
    };

    drawHeader();

    for (const result of results) {
      const values = cols.map((column) => column.get(result) || '—');
      doc.fontSize(7.5);
      const height =
        Math.max(
          ...values.map((value, i) =>
            doc.heightOfString(value, { width: (widths[i] as number) - padding * 2 }),
          ),
        ) + 8;

      if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      if (result.status !== 'success') {
        const fill = result.status === 'not_found' ? '#fff6e5' : result.status === 'derived' ? '#edf2f9' : '#fdecec';
        doc.rect(left, y, usable, height).fill(fill);
        doc.fillColor('#000');
      }
      let x = left;
      values.forEach((value, i) => {
        doc.text(value, x + padding, y + 4, { width: (widths[i] as number) - padding * 2 });
        x += widths[i] as number;
      });
      doc
        .moveTo(left, y + height)
        .lineTo(right, y + height)
        .strokeColor('#e2e6ea')
        .lineWidth(0.5)
        .stroke();
      doc.y = y + height;
    }

    const failures = results.filter((result) => result.status !== 'success');
    if (failures.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text(`Entries needing attention (${failures.length})`);
      doc.moveDown(0.5).fontSize(9).font('Helvetica');
      for (const failure of failures) {
        doc
          .font('Helvetica-Bold')
          .text(`${failure.input}`, { continued: true })
          .font('Helvetica')
          .fillColor('#8a1c1c')
          .text(`  — ${STATUS_LABEL[failure.status]}${failure.code ? ` (${failure.code})` : ''}`)
          .fillColor('#333')
          .text(failure.message ?? 'No further detail returned', { indent: 12 })
          .fillColor('#000')
          .moveDown(0.4);
      }
    }

    doc.end();
  });
}

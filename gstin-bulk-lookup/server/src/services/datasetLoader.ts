/**
 * Builds a GSTIN -> record index from reference files you already have.
 *
 * This is the no-API-key path. Almost every business that needs bulk GSTIN
 * lookups already holds the answers somewhere: a vendor master exported from
 * Tally/SAP/Zoho, a purchase register, or the GSTR-2A / GSTR-2B JSON that the
 * GST portal itself hands you for every return period. Point the app at those
 * and it resolves GSTINs from your own data, with no credentials and no
 * third-party terms to accept.
 *
 * Understood inputs:
 *   - CSV / TSV / TXT with a header row (columns auto-detected by name)
 *   - XLSX (every sheet, same auto-detection)
 *   - GSTR-2A / GSTR-2B JSON downloaded from the GST portal
 *   - this application's own JSON export, so a paid batch can be reused offline
 *   - a plain JSON array of objects using any of the recognised column names
 */

import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { normalizeGstin, validateGstin } from '../lib/gstin.js';
import { joinAddressParts, mapGstnPayload, type RawGstnPayload } from '../lib/gstnMapper.js';
import type { GstinRecord } from '../types.js';

/** Canonical field -> header aliases, compared after lower-casing and stripping punctuation. */
const FIELD_ALIASES: Record<string, string[]> = {
  gstin: ['gstin', 'gstinno', 'gstno', 'gstnumber', 'gstidentificationnumber', 'ctin', 'gstinofsupplier', 'suppliergstin', 'vendorgstin'],
  legalName: ['legalname', 'lgnm', 'nameoftaxpayer', 'taxpayername', 'registeredname', 'businessname', 'companyname', 'vendorname', 'partyname', 'name'],
  tradeName: ['tradename', 'tradenam', 'trdnm', 'tradingname', 'dbaname'],
  status: ['status', 'gststatus', 'sts', 'gstinstatus', 'registrationstatus'],
  taxpayerType: ['taxpayertype', 'dty', 'dealertype', 'type'],
  constitution: ['constitution', 'ctb', 'constitutionofbusiness', 'entitytype', 'businesstype'],
  registrationDate: ['registrationdate', 'rgdt', 'registeredon', 'dateofregistration', 'regdate'],
  cancellationDate: ['cancellationdate', 'cxdt', 'cancelledon', 'dateofcancellation'],
  address: ['address', 'registeredaddress', 'principaladdress', 'fulladdress', 'addressline', 'principalplaceofbusiness', 'billingaddress'],
  buildingName: ['building', 'buildingname', 'bnm', 'premises', 'addressline1'],
  street: ['street', 'st', 'road', 'addressline2'],
  locality: ['locality', 'loc', 'area', 'addressline3'],
  city: ['city', 'town'],
  district: ['district', 'dst'],
  state: ['state', 'stcd', 'statename'],
  pincode: ['pincode', 'pin', 'pncd', 'postalcode', 'zip', 'zipcode'],
  centreJurisdiction: ['centrejurisdiction', 'ctj', 'centraljurisdiction'],
  stateJurisdiction: ['statejurisdiction', 'stj'],
  natureOfBusiness: ['natureofbusiness', 'nba', 'nature'],
};

const canonicalise = (header: string): string => header.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Map each canonical field to the column index that holds it, if any. */
function mapHeaders(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalised = headers.map(canonicalise);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const index = normalised.indexOf(alias);
      if (index >= 0) {
        mapping[field] = index;
        break;
      }
    }
  }
  return mapping;
}

const BLANK = new Set(['', '-', '--', 'na', 'n/a', 'nil', 'none', 'null', 'undefined']);

function value(row: string[], mapping: Record<string, number>, field: string): string | undefined {
  const index = mapping[field];
  if (index === undefined) return undefined;
  const raw = (row[index] ?? '').trim();
  return BLANK.has(raw.toLowerCase()) ? undefined : raw;
}

/** A dataset row reduced to the fields we understand, before normalisation. */
export interface DatasetRow {
  gstin: string;
  legalName?: string;
  tradeName?: string;
  status?: string;
  taxpayerType?: string;
  constitution?: string;
  registrationDate?: string;
  cancellationDate?: string;
  address?: string;
  buildingName?: string;
  street?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  centreJurisdiction?: string;
  stateJurisdiction?: string;
  natureOfBusiness?: string;
}

/**
 * Turn one dataset row into a canonical record.
 *
 * Address handling: component columns (street, city, ...) are always carried
 * through, so dataset rows expose the same fields as registry rows. When the file
 * also has a single free-text address column, that text wins for the one-line
 * address — re-assembling someone's address from partial columns would lose
 * detail their own string already carries. State and pincode are appended to it
 * only when the text does not already contain them.
 */
export function rowToRecord(row: DatasetRow, source: string): GstinRecord {
  const hasComponents = Boolean(
    row.buildingName || row.street || row.locality || row.city || row.district || row.state || row.pincode,
  );

  const payload: RawGstnPayload = {
    lgnm: row.legalName,
    tradeNam: row.tradeName,
    sts: row.status,
    dty: row.taxpayerType,
    ctb: row.constitution,
    rgdt: row.registrationDate,
    cxdt: row.cancellationDate,
    ctj: row.centreJurisdiction,
    stj: row.stateJurisdiction,
    nba: row.natureOfBusiness,
    pradr:
      hasComponents || row.address
        ? {
            addr: {
              bnm: row.buildingName,
              st: row.street,
              loc: row.locality,
              city: row.city,
              dst: row.district,
              stcd: row.state,
              pncd: row.pincode,
            },
          }
        : undefined,
  };

  const record = mapGstnPayload(row.gstin, payload, {
    verifiedBy: 'dataset',
    note: `Reference dataset: ${source}`,
  });

  if (row.address && record.principalAddress) {
    const text = row.address.toLowerCase();
    const extras = [row.state, row.pincode].filter(
      (part): part is string => Boolean(part) && !text.includes((part as string).toLowerCase()),
    );
    record.principalAddress.formatted = joinAddressParts([row.address, ...extras]);
  }

  // The dataset is the only source here, so do not pretend a raw GSTN payload exists.
  record.raw = { source, row };
  return record;
}

// ---------------------------------------------------------------- parsers ---

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

function rowsToDatasetRows(rows: string[][]): DatasetRow[] {
  const header = rows[0];
  if (!header) return [];
  const mapping = mapHeaders(header);
  if (mapping.gstin === undefined) {
    throw new Error(
      `no GSTIN column found. Expected a header such as "GSTIN", "GST No" or "ctin"; saw: ${header.slice(0, 12).join(', ')}`,
    );
  }

  const out: DatasetRow[] = [];
  for (const row of rows.slice(1)) {
    const gstin = normalizeGstin(value(row, mapping, 'gstin') ?? '');
    if (gstin === '') continue;
    out.push({
      gstin,
      legalName: value(row, mapping, 'legalName'),
      tradeName: value(row, mapping, 'tradeName'),
      status: value(row, mapping, 'status'),
      taxpayerType: value(row, mapping, 'taxpayerType'),
      constitution: value(row, mapping, 'constitution'),
      registrationDate: value(row, mapping, 'registrationDate'),
      cancellationDate: value(row, mapping, 'cancellationDate'),
      address: value(row, mapping, 'address'),
      buildingName: value(row, mapping, 'buildingName'),
      street: value(row, mapping, 'street'),
      locality: value(row, mapping, 'locality'),
      city: value(row, mapping, 'city'),
      district: value(row, mapping, 'district'),
      state: value(row, mapping, 'state'),
      pincode: value(row, mapping, 'pincode'),
      centreJurisdiction: value(row, mapping, 'centreJurisdiction'),
      stateJurisdiction: value(row, mapping, 'stateJurisdiction'),
      natureOfBusiness: value(row, mapping, 'natureOfBusiness'),
    });
  }
  return out;
}

export function parseDelimitedDataset(text: string): DatasetRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/).filter((line) => line.trim() !== '');
  const delimiter = detectDelimiter(lines.slice(0, 10).join('\n'));
  return rowsToDatasetRows(lines.map((line) => splitDelimited(line, delimiter)));
}

export async function parseWorkbookDataset(buffer: Buffer): Promise<DatasetRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const out: DatasetRow[] = [];
  let lastError: Error | null = null;
  let parsedAnySheet = false;

  workbook.eachSheet((sheet) => {
    const rows: string[][] = [];
    sheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        const raw = cell.value;
        if (raw === null || raw === undefined) cells.push('');
        else if (typeof raw === 'object' && 'text' in raw) cells.push(String((raw as { text: unknown }).text ?? ''));
        else if (typeof raw === 'object' && 'result' in raw) cells.push(String((raw as { result: unknown }).result ?? ''));
        else cells.push(String(raw));
      });
      rows.push(cells);
    });
    try {
      out.push(...rowsToDatasetRows(rows));
      parsedAnySheet = true;
    } catch (error) {
      // A workbook may hold unrelated sheets; only fail if no sheet worked.
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  });

  if (!parsedAnySheet && lastError) throw lastError;
  return out;
}

/** GSTR-2A / GSTR-2B b2b block: supplier GSTIN in `ctin`, trade name in `trdnm`. */
interface GstrB2bEntry {
  ctin?: string;
  trdnm?: string;
  supfildt?: string;
  [key: string]: unknown;
}

export function parseJsonDataset(text: string, source: string): DatasetRow[] {
  const parsed: unknown = JSON.parse(text);

  // 1. This application's own JSON export.
  const asExport = parsed as { results?: Array<{ gstin?: string; record?: GstinRecord | null }> };
  if (Array.isArray(asExport?.results)) {
    const rows: DatasetRow[] = [];
    for (const entry of asExport.results) {
      const record = entry?.record;
      if (!record || !entry.gstin) continue;
      rows.push({
        gstin: normalizeGstin(entry.gstin),
        legalName: record.legalName ?? undefined,
        tradeName: record.tradeName ?? undefined,
        status: record.status ?? undefined,
        taxpayerType: record.taxpayerType ?? undefined,
        constitution: record.constitutionOfBusiness ?? undefined,
        registrationDate: record.registrationDate ?? undefined,
        cancellationDate: record.cancellationDate ?? undefined,
        address: record.principalAddress?.formatted ?? undefined,
        city: record.principalAddress?.city ?? undefined,
        state: record.principalAddress?.state ?? undefined,
        pincode: record.principalAddress?.pincode ?? undefined,
        centreJurisdiction: record.centreJurisdiction ?? undefined,
        stateJurisdiction: record.stateJurisdiction ?? undefined,
        natureOfBusiness: record.natureOfBusiness?.join(', ') || undefined,
      });
    }
    if (rows.length > 0) return rows;
  }

  // 2. GSTR-2A / GSTR-2B JSON straight from the GST portal.
  const asGstr = parsed as { b2b?: GstrB2bEntry[]; data?: { docdata?: { b2b?: GstrB2bEntry[] } } };
  const b2b = asGstr?.b2b ?? asGstr?.data?.docdata?.b2b;
  if (Array.isArray(b2b)) {
    const seen = new Map<string, DatasetRow>();
    for (const entry of b2b) {
      const gstin = normalizeGstin(entry?.ctin ?? '');
      if (gstin === '' || seen.has(gstin)) continue;
      seen.set(gstin, { gstin, tradeName: entry.trdnm?.trim() || undefined, legalName: entry.trdnm?.trim() || undefined });
    }
    if (seen.size > 0) return [...seen.values()];
  }

  // 3. A plain array of objects using any recognised field name.
  const asArray = Array.isArray(parsed) ? parsed : null;
  if (asArray && asArray.length > 0) {
    const keys = [...new Set(asArray.flatMap((item) => Object.keys((item ?? {}) as object)))];
    const rows = asArray.map((item) => keys.map((key) => String((item as Record<string, unknown>)[key] ?? '')));
    return rowsToDatasetRows([keys, ...rows]);
  }

  throw new Error(
    `${source}: unrecognised JSON. Supported: this app's export, GSTR-2A/2B from the GST portal, or an array of objects with a GSTIN field.`,
  );
}

// ---------------------------------------------------------------- loading ---

export interface LoadedDataset {
  /** GSTIN -> record. */
  byGstin: Map<string, GstinRecord>;
  /** PAN -> the GSTINs present for it, used for same-PAN name inference. */
  byPan: Map<string, string[]>;
  files: Array<{ path: string; rows: number }>;
  /** Rows skipped because the GSTIN failed structural validation. */
  skipped: number;
}

async function readOne(filePath: string): Promise<DatasetRow[]> {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.xlsx' || extension === '.xlsm') {
    return parseWorkbookDataset(await fs.promises.readFile(filePath));
  }
  const text = await fs.promises.readFile(filePath, 'utf8');
  if (extension === '.json') return parseJsonDataset(text, path.basename(filePath));
  return parseDelimitedDataset(text);
}

/**
 * Load and index every configured reference file. Later files win on conflict,
 * so a small hand-maintained override list can sit after a large ERP export.
 */
export async function loadDataset(paths: readonly string[]): Promise<LoadedDataset> {
  const byGstin = new Map<string, GstinRecord>();
  const byPan = new Map<string, string[]>();
  const files: Array<{ path: string; rows: number }> = [];
  let skipped = 0;

  for (const filePath of paths) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`reference dataset not found: ${resolved}`);
    }

    let rows: DatasetRow[];
    try {
      rows = await readOne(resolved);
    } catch (error) {
      throw new Error(`could not read ${path.basename(resolved)}: ${error instanceof Error ? error.message : error}`);
    }

    const source = path.basename(resolved);
    let accepted = 0;
    for (const row of rows) {
      // Indexing an invalid GSTIN would let a typo in the reference file answer
      // a lookup; those rows are counted and dropped instead.
      if (!validateGstin(row.gstin).valid) {
        skipped += 1;
        continue;
      }
      byGstin.set(row.gstin, rowToRecord(row, source));
      accepted += 1;
    }
    files.push({ path: resolved, rows: accepted });
  }

  for (const gstin of byGstin.keys()) {
    const pan = gstin.slice(2, 12);
    const list = byPan.get(pan);
    if (list) list.push(gstin);
    else byPan.set(pan, [gstin]);
  }

  return { byGstin, byPan, files, skipped };
}

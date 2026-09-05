/** The keyless path: reference files, PAN inference, and local-only validation. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadDataset, parseDelimitedDataset, parseJsonDataset, rowToRecord } from '../services/datasetLoader.js';
import { LocalProvider } from '../providers/local.js';

const A = '27AAPFU0939F1ZV';
const B = '09AAACH7409R1ZZ';

let dir: string;
const write = (name: string, content: string): string => {
  const target = path.join(dir, name);
  fs.writeFileSync(target, content);
  return target;
};

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstin-dataset-'));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('parseDelimitedDataset', () => {
  it('detects columns whatever they are called', () => {
    const rows = parseDelimitedDataset(
      `GST No,Party Name,Trading Name,City,State,PIN\n${A},ACME TRADERS,ACME,Pune,Maharashtra,411005\n`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      gstin: A,
      legalName: 'ACME TRADERS',
      tradeName: 'ACME',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
    });
  });

  it('explains itself when no GSTIN column is present', () => {
    expect(() => parseDelimitedDataset('Name,City\nACME,Pune\n')).toThrow(/no GSTIN column found/i);
  });

  it('treats placeholder cells as absent', () => {
    const rows = parseDelimitedDataset(`GSTIN,Legal Name,City\n${A},N/A,-\n`);
    expect(rows[0]?.legalName).toBeUndefined();
    expect(rows[0]?.city).toBeUndefined();
  });
});

describe('rowToRecord', () => {
  it('assembles a single-line address from component columns', () => {
    const record = rowToRecord(
      { gstin: A, legalName: 'ACME TRADERS', street: 'MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411005' },
      'vendors.csv',
    );
    expect(record.principalAddress?.formatted).toBe('MG Road, Pune, Maharashtra, 411005');
    expect(record.verifiedBy).toBe('dataset');
    expect(record.provenance).toBe('Reference dataset: vendors.csv');
    expect(record.derived?.pan).toBe('AAPFU0939F');
  });

  it('uses a single free-text address column verbatim', () => {
    const record = rowToRecord(
      { gstin: A, legalName: 'ACME', address: 'Plot 14, MG Road, Shivajinagar', state: 'Maharashtra', pincode: '411005' },
      'vendors.csv',
    );
    expect(record.principalAddress?.formatted).toBe('Plot 14, MG Road, Shivajinagar, Maharashtra, 411005');
  });
});

describe('parseJsonDataset', () => {
  it("reads this app's own JSON export", () => {
    const exported = JSON.stringify({
      results: [
        {
          gstin: A,
          record: {
            legalName: 'ACME TRADERS',
            principalAddress: { formatted: 'MG Road, Pune', city: 'Pune', state: 'Maharashtra', pincode: '411005' },
            natureOfBusiness: ['Retail Business'],
          },
        },
      ],
    });
    const rows = parseJsonDataset(exported, 'export.json');
    expect(rows[0]).toMatchObject({ gstin: A, legalName: 'ACME TRADERS', city: 'Pune' });
  });

  it('reads GSTR-2B b2b blocks from the GST portal', () => {
    const gstr = JSON.stringify({
      data: { docdata: { b2b: [{ ctin: A, trdnm: 'ACME TRADERS' }, { ctin: B, trdnm: 'BETA INDUSTRIES' }] } },
    });
    const rows = parseJsonDataset(gstr, 'gstr2b.json');
    expect(rows.map((row) => row.gstin)).toEqual([A, B]);
    expect(rows[0]?.tradeName).toBe('ACME TRADERS');
  });

  it('reads a plain array of objects', () => {
    const rows = parseJsonDataset(JSON.stringify([{ gstin: A, name: 'ACME TRADERS', city: 'Pune' }]), 'list.json');
    expect(rows[0]).toMatchObject({ gstin: A, legalName: 'ACME TRADERS', city: 'Pune' });
  });

  it('rejects JSON it cannot interpret', () => {
    expect(() => parseJsonDataset('{"unrelated":true}', 'x.json')).toThrow(/unrecognised JSON/i);
  });
});

describe('loadDataset', () => {
  it('indexes rows and refuses to index an invalid GSTIN', async () => {
    const file = write('vendors.csv', `GSTIN,Legal Name,City\n${A},ACME TRADERS,Pune\n27AAPFU0939F1ZA,TYPO LTD,Pune\n`);
    const loaded = await loadDataset([file]);
    expect(loaded.byGstin.size).toBe(1);
    // A typo'd GSTIN in the reference file must never answer a lookup.
    expect(loaded.skipped).toBe(1);
    expect(loaded.byGstin.get(A)?.legalName).toBe('ACME TRADERS');
  });

  it('lets a later file override an earlier one', async () => {
    const base = write('base.csv', `GSTIN,Legal Name\n${A},OLD NAME\n`);
    const override = write('override.csv', `GSTIN,Legal Name\n${A},NEW NAME\n`);
    const loaded = await loadDataset([base, override]);
    expect(loaded.byGstin.get(A)?.legalName).toBe('NEW NAME');
  });

  it('reads an xlsx workbook', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vendors');
    sheet.addRow(['GSTIN', 'Legal Name', 'City']);
    sheet.addRow([A, 'ACME TRADERS', 'Pune']);
    const target = path.join(dir, 'vendors.xlsx');
    await workbook.xlsx.writeFile(target);

    const loaded = await loadDataset([target]);
    expect(loaded.byGstin.get(A)?.legalName).toBe('ACME TRADERS');
  });

  it('reports a missing file by path', async () => {
    await expect(loadDataset([path.join(dir, 'nope.csv')])).rejects.toThrow(/not found/i);
  });

  it('indexes by PAN for same-entity inference', async () => {
    const file = write('pan.csv', `GSTIN,Legal Name\n${A},ACME TRADERS\n`);
    const loaded = await loadDataset([file]);
    expect(loaded.byPan.get('AAPFU0939F')).toEqual([A]);
  });
});

describe('LocalProvider', () => {
  const provider = new LocalProvider();

  it('needs no configuration', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it('returns derived facts and never invents a name or address', async () => {
    const response = await provider.lookup(A);
    expect(response.kind).toBe('derived');
    if (response.kind !== 'derived') return;
    expect(response.record.derived).toMatchObject({
      pan: 'AAPFU0939F',
      stateName: 'Maharashtra',
      entityType: 'Firm / Partnership',
    });
    expect(response.record.legalName).toBeNull();
    expect(response.record.principalAddress).toBeNull();
    expect(response.record.verifiedBy).toBe('derived');
  });
});

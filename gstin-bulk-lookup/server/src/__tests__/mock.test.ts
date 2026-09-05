import { describe, expect, it } from 'vitest';
import { MockProvider } from '../providers/mock.js';
import { computeCheckDigit } from '../lib/gstin.js';

/** Build 200 structurally valid GSTINs spread across states and PAN holder types. */
function sampleGstins(): string[] {
  const states = ['07', '09', '19', '24', '27', '29', '32', '33', '36', '38'];
  const entities = ['C', 'P', 'F', 'E', 'H', 'T', 'A', 'B', 'G', 'L'];
  const out: string[] = [];
  for (let i = 0; i < 200; i += 1) {
    const state = states[i % states.length] as string;
    const entity = entities[Math.floor(i / states.length) % entities.length] as string;
    const serial = String(i).padStart(4, '0');
    const base = `${state}AA${entity}CU${serial}R1Z`;
    out.push(base + computeCheckDigit(base));
  }
  return out;
}

const provider = new MockProvider(0);

describe('MockProvider', () => {
  it('never emits an undefined field in a generated record', async () => {
    // Regression guard: the seed is an unsigned 32-bit FNV hash, so a signed
    // shift used to wrap negative and index past the start of a lookup table.
    for (const gstin of sampleGstins()) {
      const response = await provider.lookup(gstin);
      if (response.kind !== 'found') continue;
      const record = response.record;
      const serialized = JSON.stringify(record);
      expect(serialized, `undefined leaked into the record for ${gstin}`).not.toMatch(/undefined/i);
      expect(record.legalName).toBeTruthy();
      expect(record.taxpayerType).toBeTruthy();
      expect(record.constitutionOfBusiness).toBeTruthy();
      expect(record.principalAddress?.formatted).toBeTruthy();
      expect(record.principalAddress?.pincode).toMatch(/^\d{6}$/);
      expect(record.registrationDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(record.natureOfBusiness.length).toBeGreaterThan(0);
    }
  }, 60_000);

  it('is deterministic for the same GSTIN', async () => {
    const first = await provider.lookup('27AAPFU0939F1ZV');
    const second = await provider.lookup('27AAPFU0939F1ZV');
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('exercises the not-found and error paths so the UI can be tested offline', async () => {
    const kinds = new Set<string>();
    for (const gstin of sampleGstins()) {
      kinds.add((await provider.lookup(gstin)).kind);
    }
    expect(kinds.has('found')).toBe(true);
    expect(kinds.has('not_found')).toBe(true);
    expect(kinds.has('error')).toBe(true);
  }, 60_000);
});

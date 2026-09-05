import { describe, expect, it } from 'vitest';
import {
  computeCheckDigit,
  extractGstins,
  isValidPan,
  normalizeGstin,
  tokenizeInput,
  validateGstin,
} from '../lib/gstin.js';

/**
 * Both fixtures are GSTINs published in public GST documentation, so they
 * corroborate the check-digit implementation against an external source rather
 * than against itself.
 */
const VALID_A = '27AAPFU0939F1ZV';
const VALID_B = '09AAACH7409R1ZZ';

describe('computeCheckDigit', () => {
  it('reproduces the published check digit', () => {
    expect(computeCheckDigit(VALID_A.slice(0, 14))).toBe('V');
    expect(computeCheckDigit(VALID_B.slice(0, 14))).toBe('Z');
  });

  it('rejects inputs that are not 14 characters', () => {
    expect(() => computeCheckDigit('27AAPFU0939F1')).toThrow(/14 characters/);
  });

  it('rejects characters outside the GSTIN alphabet', () => {
    expect(() => computeCheckDigit('27AAPFU0939F1*')).toThrow(/not valid/);
  });
});

describe('normalizeGstin', () => {
  it('strips separators and upper-cases', () => {
    expect(normalizeGstin(' 27-aapfu 0939f1zv ')).toBe(VALID_A);
  });
});

describe('validateGstin', () => {
  it('accepts a well-formed GSTIN and decomposes it', () => {
    const result = validateGstin(VALID_A);
    expect(result.valid).toBe(true);
    expect(result.checksumValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.parts).toMatchObject({
      stateCode: '27',
      stateName: 'Maharashtra',
      pan: 'AAPFU0939F',
      entityType: 'Firm / Partnership',
      registrationSerial: '1',
      registrationClass: 'Regular registration',
      checkDigit: 'V',
    });
  });

  it('accepts input with stray spaces and lower case', () => {
    expect(validateGstin('27 aapfu 0939 f1zv').valid).toBe(true);
  });

  it('flags the wrong length', () => {
    const result = validateGstin('27AAPFU0939F1Z');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/must be 15 characters, found 14/);
    expect(result.parts).toBeNull();
  });

  it('flags a bad layout', () => {
    const result = validateGstin('2AAPFU00939F1ZV');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/required layout/);
  });

  it('flags an unallotted state code', () => {
    const base = `88${VALID_A.slice(2, 14)}`;
    const result = validateGstin(base + computeCheckDigit(base));
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/not an allotted GST state\/UT code/);
  });

  it('flags a wrong check digit', () => {
    const result = validateGstin('27AAPFU0939F1ZA');
    expect(result.valid).toBe(false);
    expect(result.checksumValid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/check digit/);
    // Parts are still returned so the UI can show what was understood.
    expect(result.parts?.pan).toBe('AAPFU0939F');
  });

  it('accepts a special registration class with a warning', () => {
    const base = `${VALID_A.slice(0, 13)}D`;
    const result = validateGstin(base + computeCheckDigit(base));
    expect(result.valid).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/TDS/);
  });

  it('rejects an empty string', () => {
    expect(validateGstin('').errors).toEqual(['GSTIN is empty']);
  });
});

describe('isValidPan', () => {
  it('accepts a well-formed PAN and rejects a malformed one', () => {
    expect(isValidPan('AAPFU0939F')).toBe(true);
    expect(isValidPan('AAPF00939F')).toBe(false);
  });
});

describe('extractGstins / tokenizeInput', () => {
  it('finds GSTINs embedded in free text regardless of separator', () => {
    const text = `Vendor list\n${VALID_A}, ${VALID_B};\tsomething else`;
    expect(extractGstins(text)).toEqual([VALID_A, VALID_B]);
  });

  it('de-duplicates while preserving first-seen order', () => {
    expect(extractGstins(`${VALID_B} ${VALID_A} ${VALID_B}`)).toEqual([VALID_B, VALID_A]);
  });

  it('keeps malformed tokens so they can be reported, not skipped', () => {
    const tokens = tokenizeInput(`${VALID_A}\nNOT-A-GSTIN\n${VALID_B}`);
    expect(tokens).toEqual([VALID_A, 'NOTAGSTIN', VALID_B]);
  });
});

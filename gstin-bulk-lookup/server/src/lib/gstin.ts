/**
 * GSTIN parsing, structural validation and check-digit verification.
 *
 * A GSTIN is 15 characters:
 *   [0-1]   state / UT code                     e.g. "27"
 *   [2-11]  PAN of the registered person        e.g. "AAACR5055K"
 *   [12]    registration serial for that PAN within the state ("1".."9", "A".."Z")
 *   [13]    registration class — "Z" for ordinary registrations
 *   [14]    mod-36 check digit over the first 14 characters
 */

import {
  CHECKSUM_ALPHABET,
  GST_STATE_CODES,
  PAN_ENTITY_TYPES,
  REGISTRATION_CLASS_BY_14TH_CHAR,
} from './gstReference.js';

/** Ordinary registration: 14th character is literally "Z". */
const STANDARD_GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
/** Same layout but allowing the special registration classes in the 14th slot. */
const RELAXED_GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][0-9A-Z][0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Matches a GSTIN embedded in free text (CSV cell, pasted paragraph, ...). */
export const GSTIN_SCAN_RE = /\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][0-9A-Z][0-9A-Z]\b/g;

export interface GstinParts {
  stateCode: string;
  stateName: string | null;
  pan: string;
  panEntityChar: string;
  entityType: string | null;
  registrationSerial: string;
  registrationClassChar: string;
  registrationClass: string | null;
  checkDigit: string;
}

export interface GstinValidation {
  /** The cleaned, upper-cased 15-character input (may still be malformed). */
  gstin: string;
  valid: boolean;
  /** True when every structural rule and the check digit pass. */
  checksumValid: boolean;
  /** Non-fatal observations, e.g. an unusual registration class. */
  warnings: string[];
  /** Why the GSTIN was rejected. Empty when `valid` is true. */
  errors: string[];
  /** Populated whenever the layout is recognisable, even if the check digit fails. */
  parts: GstinParts | null;
}

/** Strip spaces, dashes and case so that "27 aaac r5055 k1z5" still resolves. */
export function normalizeGstin(input: string): string {
  return input.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

/**
 * Compute the GSTIN check digit for the first 14 characters.
 *
 * Weights alternate 1, 2 from the left; each product is folded as
 * `floor(product / 36) + (product % 36)` and the total is completed to a
 * multiple of 36.
 */
export function computeCheckDigit(first14: string): string {
  if (first14.length !== 14) {
    throw new Error(`expected 14 characters to checksum, received ${first14.length}`);
  }
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = CHECKSUM_ALPHABET.indexOf(first14[i] as string);
    if (value < 0) throw new Error(`character "${first14[i]}" is not valid in a GSTIN`);
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHECKSUM_ALPHABET[(36 - (sum % 36)) % 36] as string;
}

/** True when `pan` is a structurally valid Permanent Account Number. */
export function isValidPan(pan: string): boolean {
  return PAN_RE.test(pan.toUpperCase());
}

function describeParts(gstin: string): GstinParts {
  const stateCode = gstin.slice(0, 2);
  const pan = gstin.slice(2, 12);
  const panEntityChar = pan.charAt(3);
  const registrationClassChar = gstin.charAt(13);
  return {
    stateCode,
    stateName: GST_STATE_CODES[stateCode] ?? null,
    pan,
    panEntityChar,
    entityType: PAN_ENTITY_TYPES[panEntityChar] ?? null,
    registrationSerial: gstin.charAt(12),
    registrationClassChar,
    registrationClass: REGISTRATION_CLASS_BY_14TH_CHAR[registrationClassChar] ?? null,
    checkDigit: gstin.charAt(14),
  };
}

/**
 * Validate a GSTIN offline: length, layout, state code, PAN shape and check digit.
 * No network access — this is what lets the UI reject junk before spending API credits.
 */
export function validateGstin(rawInput: string): GstinValidation {
  const gstin = normalizeGstin(rawInput ?? '');
  const errors: string[] = [];
  const warnings: string[] = [];

  if (gstin.length === 0) {
    return { gstin, valid: false, checksumValid: false, warnings, errors: ['GSTIN is empty'], parts: null };
  }
  if (gstin.length !== 15) {
    return {
      gstin,
      valid: false,
      checksumValid: false,
      warnings,
      errors: [`GSTIN must be 15 characters, found ${gstin.length}`],
      parts: null,
    };
  }

  const layoutOk = RELAXED_GSTIN_RE.test(gstin);
  if (!layoutOk) {
    errors.push(
      'GSTIN does not match the required layout (2 digits, 5 letters, 4 digits, 1 letter, then 3 alphanumerics)',
    );
    return { gstin, valid: false, checksumValid: false, warnings, errors, parts: null };
  }

  const parts = describeParts(gstin);

  if (!parts.stateName) {
    errors.push(`"${parts.stateCode}" is not an allotted GST state/UT code`);
  }
  if (!isValidPan(parts.pan)) {
    errors.push(`characters 3-12 ("${parts.pan}") are not a valid PAN`);
  }
  if (!parts.entityType) {
    warnings.push(`PAN holder type "${parts.panEntityChar}" is not a recognised category`);
  }
  if (!STANDARD_GSTIN_RE.test(gstin)) {
    if (parts.registrationClass) {
      warnings.push(`special registration class: ${parts.registrationClass}`);
    } else {
      warnings.push(
        `14th character is "${parts.registrationClassChar}" rather than "Z"; this is not a recognised registration class`,
      );
    }
  }

  let checksumValid = false;
  try {
    checksumValid = computeCheckDigit(gstin.slice(0, 14)) === parts.checkDigit;
  } catch {
    checksumValid = false;
  }
  if (!checksumValid) {
    errors.push('check digit (15th character) does not match the rest of the GSTIN');
  }

  return { gstin, valid: errors.length === 0, checksumValid, warnings, errors, parts };
}

/**
 * Pull GSTIN-shaped tokens out of arbitrary text (pasted lists, CSV rows, ...).
 * Separators are irrelevant — commas, newlines, tabs, semicolons and spaces all work.
 * Returns candidates in first-seen order, de-duplicated.
 */
export function extractGstins(text: string): string[] {
  const upper = (text ?? '').toUpperCase();
  const seen = new Set<string>();
  const found: string[] = [];

  for (const match of upper.matchAll(GSTIN_SCAN_RE)) {
    const value = match[0];
    if (!seen.has(value)) {
      seen.add(value);
      found.push(value);
    }
  }

  return found;
}

/**
 * Split user input into candidate GSTINs, preserving malformed entries so they can
 * be reported. Each line/comma/space separated token becomes one candidate.
 */
export function tokenizeInput(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawToken of (text ?? '').split(/[\s,;|]+/)) {
    const token = normalizeGstin(rawToken);
    if (token.length === 0) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

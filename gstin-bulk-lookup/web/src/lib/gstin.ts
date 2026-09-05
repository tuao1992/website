/**
 * Client-side mirror of the server's GSTIN checks (server/src/lib/gstin.ts).
 *
 * Kept local so the paste preview updates as the user types, with no round trip
 * per keystroke. The server re-validates every GSTIN before it spends an API call,
 * so this copy is a convenience, never the authority.
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const RELAXED_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][0-9A-Z][0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman and Diu (pre-2020)', '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra', '28': 'Andhra Pradesh (pre-bifurcation)', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
  '97': 'Other Territory', '99': 'Centre Jurisdiction',
};

export function normalizeGstin(input: string): string {
  return input.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

function computeCheckDigit(first14: string): string | null {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = ALPHABET.indexOf(first14[i] as string);
    if (value < 0) return null;
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return ALPHABET[(36 - (sum % 36)) % 36] as string;
}

export interface QuickCheck {
  gstin: string;
  valid: boolean;
  reason: string | null;
  stateName: string | null;
}

export function quickCheck(input: string): QuickCheck {
  const gstin = normalizeGstin(input);
  if (gstin.length !== 15) {
    return { gstin, valid: false, reason: `${gstin.length} characters — a GSTIN has 15`, stateName: null };
  }
  if (!RELAXED_RE.test(gstin)) {
    return { gstin, valid: false, reason: 'does not match the GSTIN layout', stateName: null };
  }
  const stateName = STATE_CODES[gstin.slice(0, 2)] ?? null;
  if (!stateName) {
    return { gstin, valid: false, reason: `"${gstin.slice(0, 2)}" is not a GST state code`, stateName: null };
  }
  if (!PAN_RE.test(gstin.slice(2, 12))) {
    return { gstin, valid: false, reason: 'characters 3-12 are not a valid PAN', stateName };
  }
  if (computeCheckDigit(gstin.slice(0, 14)) !== gstin.charAt(14)) {
    return { gstin, valid: false, reason: 'check digit does not match', stateName };
  }
  return { gstin, valid: true, reason: null, stateName };
}

/** Split pasted text on any separator, normalise and de-duplicate. */
export function tokenize(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\s,;|]+/)) {
    const token = normalizeGstin(raw);
    if (token === '' || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

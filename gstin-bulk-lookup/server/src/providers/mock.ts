/**
 * Offline demo provider.
 *
 * Generates deterministic, clearly synthetic records so the application is fully
 * usable — including exports and error handling — without any API credentials.
 * The data is NOT real: `/api/config` reports `synthetic: true` for this provider
 * and the UI shows a banner saying so. Point GSTIN_PROVIDER at a real GSP before
 * using any of this for compliance or vendor-onboarding decisions.
 */

import { validateGstin } from '../lib/gstin.js';
import { mapGstnPayload, type RawGstnPayload } from '../lib/gstnMapper.js';
import type { GstinProvider, ProviderResponse } from '../types.js';

/** FNV-1a — stable across runs and processes, which keeps demo output reproducible. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

/** Index into `list` from a seed. `Math.abs` keeps a caller's arithmetic from ever
 *  producing a negative index (FNV hashes exceed 2^31). */
function pick<T>(list: readonly T[], seed: number): T {
  return list[Math.abs(Math.trunc(seed)) % list.length] as T;
}

const PREFIXES = ['Anand', 'Bharat', 'Chetak', 'Deepak', 'Everest', 'Ganga', 'Himalaya', 'Indus', 'Kaveri', 'Lotus',
  'Meridian', 'Narmada', 'Orbit', 'Pinnacle', 'Quantum', 'Rajdhani', 'Sagar', 'Trident', 'Udaan', 'Vindhya'] as const;
const MIDDLES = ['Steel', 'Textiles', 'Chemicals', 'Logistics', 'Polymers', 'Agro', 'Electricals', 'Pharma',
  'Infratech', 'Packaging', 'Solvents', 'Engineering', 'Foods', 'Traders', 'Enterprises'] as const;

const SUFFIX_BY_ENTITY: Readonly<Record<string, { suffix: string; constitution: string }>> = {
  C: { suffix: 'Private Limited', constitution: 'Private Limited Company' },
  P: { suffix: '', constitution: 'Proprietorship' },
  F: { suffix: '& Co.', constitution: 'Partnership' },
  E: { suffix: 'LLP', constitution: 'Limited Liability Partnership' },
  H: { suffix: '(HUF)', constitution: 'Hindu Undivided Family' },
  T: { suffix: 'Trust', constitution: 'Trust' },
  A: { suffix: 'Association', constitution: 'Association of Persons (AOP)' },
  B: { suffix: 'Society', constitution: 'Body of Individuals' },
  G: { suffix: '', constitution: 'Government Department' },
  L: { suffix: '', constitution: 'Local Authority' },
  J: { suffix: '', constitution: 'Artificial Juridical Person' },
  K: { suffix: 'Trust', constitution: 'Trust' },
};

const CITIES_BY_STATE: Readonly<Record<string, readonly string[]>> = {
  '07': ['New Delhi', 'Dwarka', 'Rohini'],
  '09': ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad'],
  '19': ['Kolkata', 'Howrah', 'Siliguri'],
  '23': ['Indore', 'Bhopal', 'Jabalpur'],
  '24': ['Ahmedabad', 'Surat', 'Rajkot', 'Vadodara'],
  '27': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
  '29': ['Bengaluru', 'Mysuru', 'Hubballi'],
  '32': ['Kochi', 'Thiruvananthapuram', 'Kozhikode'],
  '33': ['Chennai', 'Coimbatore', 'Madurai'],
  '36': ['Hyderabad', 'Warangal', 'Nizamabad'],
};
const DEFAULT_CITIES = ['Industrial Area', 'Civil Lines', 'Model Town'] as const;

/** Leading digits of the real postal zone for each state, so demo pincodes look plausible. */
const PINCODE_PREFIX: Readonly<Record<string, string>> = {
  '07': '11', '09': '22', '19': '70', '23': '45', '24': '38',
  '27': '41', '29': '56', '32': '68', '33': '60', '36': '50',
};

const STREETS = ['MG Road', 'Industrial Estate Road', 'Ring Road', 'Station Road', 'Sector 12', 'GIDC Phase II',
  'Nehru Nagar', 'Link Road'] as const;
const LOCALITIES = ['Phase I', 'Block C', 'Ward 14', 'Zone 3', 'Extension Area'] as const;
const NATURE = ['Retail Business', 'Wholesale Business', 'Factory / Manufacturing', 'Warehouse / Depot',
  'Office / Sale Office', 'Supplier of Services', 'Import', 'Export'] as const;
const TAXPAYER_TYPES = ['Regular', 'Regular', 'Regular', 'Composition', 'Input Service Distributor (ISD)'] as const;

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** Date deterministic in the seed, between 01-Jul-2017 (GST rollout) and 2024, as DD/MM/YYYY. */
function seededDate(seed: number): string {
  const year = 2017 + (seed % 8);
  const month = 1 + ((seed >>> 3) % 12);
  const day = 1 + ((seed >>> 7) % 28);
  const clampedMonth = year === 2017 ? Math.max(7, month) : month;
  return `${pad(day, 2)}/${pad(clampedMonth, 2)}/${year}`;
}

function buildPayload(gstin: string): RawGstnPayload {
  const seed = hash(gstin);
  const parts = validateGstin(gstin).parts;
  const stateCode = parts?.stateCode ?? '27';
  const entityChar = parts?.panEntityChar ?? 'C';
  const entity = SUFFIX_BY_ENTITY[entityChar] ?? { suffix: 'Enterprises', constitution: 'Others' };

  const base = `${pick(PREFIXES, seed)} ${pick(MIDDLES, seed >>> 5)}`;
  const legalName = `${base}${entity.suffix ? ` ${entity.suffix}` : ''}`.trim().toUpperCase();
  const tradeName = base.toUpperCase();

  const cities = CITIES_BY_STATE[stateCode] ?? DEFAULT_CITIES;
  const city = pick(cities, seed >>> 9);
  const stateName = parts?.stateName ?? 'Maharashtra';

  // A small, deterministic share of records are cancelled so the UI's status
  // handling is exercised without credentials.
  const cancelled = seed % 11 === 0;
  const registrationDate = seededDate(seed);

  const natureCount = 1 + (seed % 3);
  const nature = Array.from({ length: natureCount }, (_, i) => pick(NATURE, (seed >>> (3 * (i + 1))) + i));

  const addr = {
    flno: String(1 + (seed % 9)),
    bno: `${1 + ((seed >>> 2) % 400)}`,
    bnm: `${pick(PREFIXES, seed >>> 11)} Complex`,
    st: pick(STREETS, seed >>> 13),
    loc: pick(LOCALITIES, seed >>> 17),
    city,
    dst: city,
    stcd: stateName,
    pncd: `${PINCODE_PREFIX[stateCode] ?? `${1 + (Number(stateCode) % 8)}${(seed >>> 23) % 10}`}${pad((seed >>> 4) % 10000, 4)}`,
    lt: '',
    lg: '',
  };

  return {
    gstin,
    lgnm: legalName,
    tradeNam: tradeName,
    sts: cancelled ? 'Cancelled' : 'Active',
    dty: pick(TAXPAYER_TYPES, seed >>> 19),
    ctb: entity.constitution,
    rgdt: registrationDate,
    cxdt: cancelled ? seededDate(seed + 991) : '',
    lstupdt: seededDate(seed + 17),
    ctj: `Commissionerate - ${city} / Division - ${1 + (seed % 8)} / Range - ${1 + (seed % 20)}`,
    stj: `State - ${stateName} / Ward - ${1 + (seed % 60)}`,
    nba: [...new Set(nature)],
    pradr: { addr, ntr: nature.join(', ') },
    adadr:
      seed % 3 === 0
        ? [{ addr: { ...addr, bno: `${1 + ((seed >>> 6) % 400)}`, bnm: `${pick(PREFIXES, seed >>> 21)} Warehouse` }, ntr: 'Warehouse / Depot' }]
        : [],
    einvoiceStatus: seed % 2 === 0 ? 'Yes' : 'No',
    isFieldVisitConducted: seed % 5 === 0 ? 'Yes' : 'No',
    panNo: parts?.pan ?? '',
    _synthetic: true,
    _notice: 'Synthetic demo data generated locally. Not a real GST record.',
  };
}

export class MockProvider implements GstinProvider {
  readonly id = 'mock';
  readonly name = 'Offline demo (synthetic data)';

  /**
   * Simulated round-trip latency, so the streaming progress UI behaves offline the
   * way it will against a real API. Set MOCK_LATENCY_MS=0 (as the tests do) to
   * remove it.
   */
  constructor(private readonly maxLatencyMs = Number(process.env.MOCK_LATENCY_MS ?? 200)) {}

  isConfigured(): boolean {
    return true;
  }

  configurationHint(): string {
    return 'No configuration required.';
  }

  async lookup(gstin: string): Promise<ProviderResponse> {
    const seed = hash(gstin);
    if (this.maxLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, seed % this.maxLatencyMs));
    }

    if (seed % 25 === 0) {
      return { kind: 'not_found', message: 'No taxpayer is registered under this GSTIN', code: 'NOT_FOUND' };
    }
    if (seed % 37 === 0) {
      return {
        kind: 'error',
        message: 'Simulated upstream failure (the demo provider fails a small share of lookups on purpose)',
        code: 'PROVIDER_ERROR',
        retryable: false,
      };
    }
    return { kind: 'found', record: mapGstnPayload(gstin, buildPayload(gstin)) };
  }
}

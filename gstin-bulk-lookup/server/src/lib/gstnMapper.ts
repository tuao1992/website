/**
 * Normalises the GSTN "search taxpayer by GSTIN" payload into our canonical record.
 *
 * Every commercial GSP/aggregator we support (gstincheck, Appyflow, Masters India,
 * and most custom endpoints) relays this same GSTN structure — only the wrapper
 * around it differs — so a single mapper covers all of them.
 */

import { validateGstin } from './gstin.js';
import type { GstinAddress, GstinPlaceOfBusiness, GstinRecord } from '../types.js';

/** Raw GSTN address block. Keys are GSTN's abbreviations. */
interface RawAddr {
  flno?: string;
  bno?: string;
  bnm?: string;
  st?: string;
  loc?: string;
  city?: string;
  dst?: string;
  stcd?: string;
  pncd?: string;
  lt?: string;
  lg?: string;
  landMark?: string;
  [key: string]: unknown;
}

interface RawPlace {
  addr?: RawAddr;
  ntr?: string;
  [key: string]: unknown;
}

export interface RawGstnPayload {
  gstin?: string;
  lgnm?: string;
  tradeNam?: string;
  sts?: string;
  dty?: string;
  ctb?: string;
  rgdt?: string;
  cxdt?: string;
  lstupdt?: string;
  ctj?: string;
  ctjCd?: string;
  stj?: string;
  stjCd?: string;
  nba?: string[] | string;
  pradr?: RawPlace;
  adadr?: RawPlace[];
  einvoiceStatus?: string | boolean;
  isFieldVisitConducted?: string;
  panNo?: string;
  [key: string]: unknown;
}

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '' || text.toUpperCase() === 'NA' || text.toUpperCase() === 'NULL') return null;
  return text;
}

/** Join address parts in postal order, dropping blanks and consecutive duplicates. */
export function joinAddressParts(parts: Array<string | null | undefined>): string {
  const kept: string[] = [];
  for (const part of parts) {
    const value = clean(part);
    if (!value) continue;
    if (kept.length > 0 && kept[kept.length - 1]?.toLowerCase() === value.toLowerCase()) continue;
    kept.push(value);
  }
  return kept.join(', ');
}

export function mapAddress(raw: RawAddr | undefined | null): GstinAddress | null {
  if (!raw || typeof raw !== 'object') return null;
  const address: GstinAddress = {
    floorNo: clean(raw.flno),
    buildingNo: clean(raw.bno),
    buildingName: clean(raw.bnm),
    street: clean(raw.st),
    locality: clean(raw.loc),
    city: clean(raw.city),
    district: clean(raw.dst),
    state: clean(raw.stcd),
    stateCode: null,
    pincode: clean(raw.pncd),
    latitude: clean(raw.lt),
    longitude: clean(raw.lg),
    formatted: '',
  };
  address.formatted = joinAddressParts([
    address.floorNo ? `Floor ${address.floorNo}` : null,
    address.buildingNo,
    address.buildingName,
    address.street,
    address.locality,
    clean(raw.landMark),
    address.city,
    address.district,
    address.state,
    address.pincode,
  ]);
  // GSTN returns nothing at all for some registrations; report that plainly
  // rather than handing the UI an empty string.
  if (address.formatted === '') address.formatted = 'Address not disclosed by GSTN';
  return address;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter((item): item is string => item !== null);
  const single = clean(value);
  return single ? single.split(/\s*,\s*/).filter(Boolean) : [];
}

function mapPlaces(raw: RawPlace[] | undefined): GstinPlaceOfBusiness[] {
  if (!Array.isArray(raw)) return [];
  const places: GstinPlaceOfBusiness[] = [];
  for (const entry of raw) {
    const address = mapAddress(entry?.addr);
    if (!address) continue;
    places.push({ address, natureOfBusiness: toStringArray(entry?.ntr) });
  }
  return places;
}

function mapEInvoice(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const text = clean(value);
  if (!text) return null;
  return ['yes', 'y', 'true', '1', 'enabled'].includes(text.toLowerCase());
}

/**
 * Build a canonical record. `gstin` is the value the caller asked about and always
 * wins over whatever the provider echoed back, so a row can never be mis-attributed.
 */
export function mapGstnPayload(
  gstin: string,
  payload: RawGstnPayload,
  provenance: { verifiedBy: GstinRecord['verifiedBy']; note?: string } = { verifiedBy: 'registry' },
): GstinRecord {
  const validation = validateGstin(gstin);
  const parts = validation.parts;
  const principalAddress = mapAddress(payload.pradr?.addr);

  if (principalAddress && parts) {
    principalAddress.stateCode = parts.stateCode;
    if (!principalAddress.state) principalAddress.state = parts.stateName;
  }

  const natureOfBusiness = toStringArray(payload.nba);
  const principalNature = toStringArray(payload.pradr?.ntr);

  return {
    gstin,
    legalName: clean(payload.lgnm),
    tradeName: clean(payload.tradeNam),
    status: clean(payload.sts),
    taxpayerType: clean(payload.dty),
    constitutionOfBusiness: clean(payload.ctb),
    registrationDate: clean(payload.rgdt),
    cancellationDate: clean(payload.cxdt),
    lastUpdatedDate: clean(payload.lstupdt),
    centreJurisdiction: clean(payload.ctj) ?? clean(payload.ctjCd),
    stateJurisdiction: clean(payload.stj) ?? clean(payload.stjCd),
    natureOfBusiness: natureOfBusiness.length > 0 ? natureOfBusiness : principalNature,
    eInvoiceEnabled: mapEInvoice(payload.einvoiceStatus),
    isFieldVisitConducted: clean(payload.isFieldVisitConducted),
    verifiedBy: provenance.verifiedBy,
    provenance: provenance.note ?? null,
    principalAddress,
    additionalAddresses: mapPlaces(payload.adadr),
    derived: parts
      ? {
          stateCode: parts.stateCode,
          stateName: parts.stateName,
          pan: parts.pan,
          entityType: parts.entityType,
          registrationSerial: parts.registrationSerial,
          registrationClass: parts.registrationClass,
        }
      : null,
    raw: payload,
  };
}

/** Read a dotted path such as "data.taxpayerInfo" out of an arbitrary JSON body. */
export function readPath(source: unknown, path: string): unknown {
  if (!path) return source;
  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Canonical shapes shared by the providers, the API and the front end. */

export interface GstinAddress {
  /** Door / flat number. */
  floorNo?: string | null;
  /** Building number. */
  buildingNo?: string | null;
  /** Building or premises name. */
  buildingName?: string | null;
  street?: string | null;
  locality?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  /** Single-line address assembled from whichever parts the provider returned. */
  formatted: string;
}

export interface GstinPlaceOfBusiness {
  address: GstinAddress;
  /** e.g. "Retail Business, Warehouse / Depot". */
  natureOfBusiness: string[];
}

/** Everything we can say about one GSTIN, provider-agnostic. */
export interface GstinRecord {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  /** "Active", "Cancelled", "Suspended", "Provisional", ... */
  status: string | null;
  /** e.g. "Regular", "Composition", "Input Service Distributor". */
  taxpayerType: string | null;
  /** e.g. "Private Limited Company", "Proprietorship". */
  constitutionOfBusiness: string | null;
  registrationDate: string | null;
  cancellationDate: string | null;
  lastUpdatedDate: string | null;
  centreJurisdiction: string | null;
  stateJurisdiction: string | null;
  natureOfBusiness: string[];
  eInvoiceEnabled: boolean | null;
  isFieldVisitConducted: string | null;
  /**
   * Where the business details came from, so a row is never mistaken for a live
   * registry answer: 'registry' = a GST data provider, 'dataset' = a reference
   * file you supplied, 'derived' = decoded from the GSTIN alone, 'demo' =
   * invented by the offline demo provider.
   */
  verifiedBy: 'registry' | 'dataset' | 'derived' | 'demo';
  /** How the record was obtained, shown in the detail view. Null for registry hits. */
  provenance: string | null;
  principalAddress: GstinAddress | null;
  additionalAddresses: GstinPlaceOfBusiness[];
  /** Facts derived from the GSTIN itself; always present, never from the network. */
  derived: {
    stateCode: string;
    stateName: string | null;
    pan: string;
    entityType: string | null;
    registrationSerial: string;
    registrationClass: string | null;
  } | null;
  /** Untouched provider payload, for auditing and for fields we do not model. */
  raw?: unknown;
}

export type LookupStatus =
  /** Provider returned a record from a registry or reference dataset. */
  | 'success'
  /**
   * No registry answered, but the GSTIN is valid and the facts encoded in it
   * (state, PAN, holder type, registration class) are reported. Never carries a
   * registered name or address — those cannot be derived.
   */
  | 'derived'
  /** Failed offline validation (layout / state code / PAN / check digit). */
  | 'invalid'
  /** Structurally valid but no taxpayer exists with that GSTIN. */
  | 'not_found'
  /** Provider reachable but the call failed (auth, quota, upstream 5xx, timeout). */
  | 'error';

export interface LookupResult {
  /** Exactly as the user supplied it, so they can match rows back to their input. */
  input: string;
  gstin: string;
  status: LookupStatus;
  /** Present when `status === 'success'`. */
  record: GstinRecord | null;
  /** Human-readable explanation for every non-success status. */
  message: string | null;
  /** Machine-readable reason, e.g. "INVALID_CHECKSUM", "PROVIDER_UNAUTHORIZED". */
  code: string | null;
  validation: {
    valid: boolean;
    checksumValid: boolean;
    errors: string[];
    warnings: string[];
  };
  /** Which provider answered, and whether the answer came from cache. */
  source: string;
  cached: boolean;
  durationMs: number;
}

export interface LookupSummary {
  total: number;
  success: number;
  /** Rows answered only from the GSTIN itself — no registry, no dataset. */
  derived: number;
  invalid: number;
  notFound: number;
  errors: number;
  cached: number;
  durationMs: number;
  provider: string;
}

/** Result of asking a provider about one GSTIN. */
export type ProviderResponse =
  | { kind: 'found'; record: GstinRecord }
  /** Partial answer: structurally sound, but nothing authoritative about the business. */
  | { kind: 'derived'; record: GstinRecord; message: string }
  | { kind: 'not_found'; message: string; code?: string }
  | { kind: 'error'; message: string; code?: string; retryable?: boolean };

export interface GstinProvider {
  /** Value accepted by the GSTIN_PROVIDER environment variable. */
  readonly id: string;
  readonly name: string;
  /** Where a user goes to obtain credentials. */
  readonly docsUrl?: string;
  /** False when required credentials are missing; the server then refuses to start in that mode. */
  isConfigured(): boolean;
  /** Explains what is missing when `isConfigured()` is false. */
  configurationHint(): string;
  lookup(gstin: string, signal: AbortSignal): Promise<ProviderResponse>;
}

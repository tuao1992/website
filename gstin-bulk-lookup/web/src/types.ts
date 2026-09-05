/** Mirrors the canonical shapes in server/src/types.ts. */

export interface GstinAddress {
  floorNo?: string | null;
  buildingNo?: string | null;
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
  formatted: string;
}

export interface GstinPlaceOfBusiness {
  address: GstinAddress;
  natureOfBusiness: string[];
}

export interface GstinRecord {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  status: string | null;
  taxpayerType: string | null;
  constitutionOfBusiness: string | null;
  registrationDate: string | null;
  cancellationDate: string | null;
  lastUpdatedDate: string | null;
  centreJurisdiction: string | null;
  stateJurisdiction: string | null;
  natureOfBusiness: string[];
  eInvoiceEnabled: boolean | null;
  isFieldVisitConducted: string | null;
  principalAddress: GstinAddress | null;
  additionalAddresses: GstinPlaceOfBusiness[];
  derived: {
    stateCode: string;
    stateName: string | null;
    pan: string;
    entityType: string | null;
    registrationSerial: string;
    registrationClass: string | null;
  } | null;
  raw?: unknown;
}

export type LookupStatus = 'success' | 'invalid' | 'not_found' | 'error';

export interface LookupResult {
  input: string;
  gstin: string;
  status: LookupStatus;
  record: GstinRecord | null;
  message: string | null;
  code: string | null;
  validation: { valid: boolean; checksumValid: boolean; errors: string[]; warnings: string[] };
  source: string;
  cached: boolean;
  durationMs: number;
}

export interface LookupSummary {
  total: number;
  success: number;
  invalid: number;
  notFound: number;
  errors: number;
  cached: number;
  durationMs: number;
  provider: string;
}

export interface AppConfig {
  provider: { id: string; name: string; docsUrl?: string; ready: boolean; synthetic: boolean; error?: string };
  availableProviders: string[];
  limits: { maxBatchSize: number; concurrency: number; maxUploadBytes: number };
  cache: { enabled: boolean; ttlMinutes: number };
  stateCodes: Record<string, string>;
}

export interface ValidationItem {
  input: string;
  gstin: string;
  valid: boolean;
  checksumValid: boolean;
  errors: string[];
  warnings: string[];
  stateName: string | null;
  pan: string | null;
  entityType: string | null;
}

export interface UploadResponse {
  filename: string;
  strategy: 'gstin-column' | 'cell-scan';
  column: string | null;
  sheets: string[] | null;
  rowsScanned: number;
  total: number;
  validCount: number;
  invalidCount: number;
  candidates: string[];
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

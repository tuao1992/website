import type { LookupResult, LookupStatus } from '../types';

export const STATUS_LABEL: Record<LookupStatus, string> = {
  success: 'Found',
  invalid: 'Invalid GSTIN',
  not_found: 'Not found',
  error: 'Lookup failed',
};

export const STATUS_TONE: Record<LookupStatus, string> = {
  success: 'ok',
  invalid: 'bad',
  not_found: 'warn',
  error: 'bad',
};

export const dash = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '—' : String(value);

/** GST registration status ("Active" / "Cancelled" / "Suspended") to a colour tone. */
export function gstStatusTone(status: string | null | undefined): string {
  if (!status) return 'muted';
  const lower = status.toLowerCase();
  if (lower.includes('active')) return 'ok';
  if (lower.includes('cancel') || lower.includes('inactive')) return 'bad';
  if (lower.includes('suspend') || lower.includes('provisional')) return 'warn';
  return 'muted';
}

/** Everything a row exposes to the search box. */
export function searchHaystack(result: LookupResult): string {
  const record = result.record;
  return [
    result.input,
    result.gstin,
    result.message,
    record?.legalName,
    record?.tradeName,
    record?.status,
    record?.taxpayerType,
    record?.constitutionOfBusiness,
    record?.principalAddress?.formatted,
    record?.principalAddress?.city,
    record?.principalAddress?.state,
    record?.principalAddress?.pincode,
    record?.derived?.pan,
    record?.derived?.stateName,
    ...(record?.natureOfBusiness ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

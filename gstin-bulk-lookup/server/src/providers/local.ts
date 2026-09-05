/**
 * No network, no credentials, no reference data: reports only what the GSTIN
 * itself proves.
 *
 * A GSTIN encodes the state of registration, the holder's PAN, the type of PAN
 * holder and the registration class, and its check digit proves the whole string
 * was not mistyped. It does NOT encode the business name or address — nothing
 * can derive those — so this provider never invents them, and its results are
 * reported as "Validated only" rather than as a registry hit.
 *
 * Useful on its own for cleaning a list before you spend anything on it, and as
 * the last link in a chain (GSTIN_PROVIDER=dataset,local).
 */

import { mapGstnPayload } from '../lib/gstnMapper.js';
import type { GstinProvider, ProviderResponse } from '../types.js';

export class LocalProvider implements GstinProvider {
  readonly id = 'local';
  readonly name = 'Local validation only (no registry)';

  isConfigured(): boolean {
    return true;
  }

  configurationHint(): string {
    return 'No configuration required.';
  }

  async lookup(gstin: string): Promise<ProviderResponse> {
    // An empty payload: mapGstnPayload still fills in everything derivable from
    // the GSTIN, and leaves every business-detail field null.
    const record = mapGstnPayload(gstin, {}, {
      verifiedBy: 'derived',
      note: 'Decoded from the GSTIN itself. No registry or reference dataset was consulted.',
    });
    return {
      kind: 'derived',
      record,
      message: 'Valid GSTIN. State, PAN and holder type decoded from it; name and address need a registry or a reference dataset.',
    };
  }
}

/**
 * Tries several providers in order and returns the first real answer.
 *
 * Set GSTIN_PROVIDER to a comma-separated list, e.g.
 *   GSTIN_PROVIDER=dataset,local        free: your own data, then decode the rest
 *   GSTIN_PROVIDER=dataset,appyflow     paid calls only for GSTINs you don't have
 *
 * Ordering matters: put the cheapest source first. A full registry hit ends the
 * chain immediately; a partial ("derived") answer is held and only returned if
 * nothing later does better, so a cheap partial never masks a paid full answer.
 */

import type { GstinProvider, ProviderResponse } from '../types.js';

export class ChainProvider implements GstinProvider {
  readonly id: string;
  readonly name: string;

  constructor(readonly members: GstinProvider[]) {
    if (members.length === 0) throw new Error('a provider chain needs at least one provider');
    this.id = members.map((member) => member.id).join(',');
    this.name = members.map((member) => member.name).join(' → ');
  }

  isConfigured(): boolean {
    return this.members.every((member) => member.isConfigured());
  }

  configurationHint(): string {
    return this.members
      .filter((member) => !member.isConfigured())
      .map((member) => `${member.id}: ${member.configurationHint()}`)
      .join(' ');
  }

  async lookup(gstin: string, signal: AbortSignal): Promise<ProviderResponse> {
    let partial: ProviderResponse | null = null;
    let failure: ProviderResponse | null = null;
    let notFound: ProviderResponse | null = null;

    for (const member of this.members) {
      const response = await member.lookup(gstin, signal);
      if (response.kind === 'found') return response;
      if (response.kind === 'derived') partial ??= response;
      else if (response.kind === 'error') failure ??= response;
      else notFound ??= response;
    }

    // Prefer the most informative outcome: a partial answer, then a real error
    // (which the user can act on), and only then "not found".
    return partial ?? failure ?? notFound ?? { kind: 'not_found', message: 'No provider returned a record', code: 'NOT_FOUND' };
  }
}

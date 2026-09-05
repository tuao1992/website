import { config } from '../config.js';
import type { GstinProvider } from '../types.js';
import { AppyflowProvider } from './appyflow.js';
import { ChainProvider } from './chain.js';
import { CustomProvider } from './custom.js';
import { DatasetProvider } from './dataset.js';
import { GstincheckProvider } from './gstincheck.js';
import { LocalProvider } from './local.js';
import { MastersIndiaProvider } from './mastersindia.js';
import { MockProvider } from './mock.js';

const registry: Record<string, () => GstinProvider> = {
  // No API key required:
  dataset: () => new DatasetProvider(),
  local: () => new LocalProvider(),
  mock: () => new MockProvider(),
  // Commercial GST data providers:
  gstincheck: () => new GstincheckProvider(),
  appyflow: () => new AppyflowProvider(),
  mastersindia: () => new MastersIndiaProvider(),
  custom: () => new CustomProvider(),
};

export const PROVIDER_IDS = Object.keys(registry);

/** Providers that need no credentials, quoted in error messages as a way forward. */
export const KEYLESS_PROVIDER_IDS = ['dataset', 'local', 'mock'];

let active: GstinProvider | null = null;

function build(id: string): GstinProvider {
  const factory = registry[id];
  if (!factory) {
    throw new Error(
      `GSTIN_PROVIDER="${id}" is not recognised. Choose one of: ${PROVIDER_IDS.join(', ')} ` +
        `(no API key needed for: ${KEYLESS_PROVIDER_IDS.join(', ')}).`,
    );
  }
  return factory();
}

/**
 * The provider selected by GSTIN_PROVIDER, which may be a comma-separated chain
 * such as "dataset,local". Throws if any member is unknown or unconfigured.
 */
export function getProvider(): GstinProvider {
  if (active) return active;

  const ids = config.provider
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) throw new Error('GSTIN_PROVIDER is empty. Set it to a provider id, e.g. "local".');

  const members = ids.map(build);
  const provider = members.length === 1 ? (members[0] as GstinProvider) : new ChainProvider(members);

  if (!provider.isConfigured()) {
    throw new Error(
      `GSTIN_PROVIDER="${config.provider}" is missing configuration. ${provider.configurationHint()}`,
    );
  }
  active = provider;
  return provider;
}

/** The dataset provider in the active chain, if any — used for startup checks and /api/config. */
export function getDatasetProvider(): DatasetProvider | null {
  const provider = getProvider();
  if (provider instanceof DatasetProvider) return provider;
  if (provider instanceof ChainProvider) {
    return provider.members.find((member) => member instanceof DatasetProvider) ?? null;
  }
  return null;
}

/** Test hook: forget the memoised provider so a new environment takes effect. */
export function resetProvider(): void {
  active = null;
}

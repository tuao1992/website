import { config } from '../config.js';
import type { GstinProvider } from '../types.js';
import { AppyflowProvider } from './appyflow.js';
import { CustomProvider } from './custom.js';
import { GstincheckProvider } from './gstincheck.js';
import { MastersIndiaProvider } from './mastersindia.js';
import { MockProvider } from './mock.js';

const registry: Record<string, () => GstinProvider> = {
  mock: () => new MockProvider(),
  gstincheck: () => new GstincheckProvider(),
  appyflow: () => new AppyflowProvider(),
  mastersindia: () => new MastersIndiaProvider(),
  custom: () => new CustomProvider(),
};

export const PROVIDER_IDS = Object.keys(registry);

let active: GstinProvider | null = null;

/** The provider selected by GSTIN_PROVIDER. Throws if it is unknown or unconfigured. */
export function getProvider(): GstinProvider {
  if (active) return active;

  const factory = registry[config.provider];
  if (!factory) {
    throw new Error(
      `GSTIN_PROVIDER="${config.provider}" is not recognised. Choose one of: ${PROVIDER_IDS.join(', ')}.`,
    );
  }

  const provider = factory();
  if (!provider.isConfigured()) {
    throw new Error(
      `GSTIN_PROVIDER="${provider.id}" (${provider.name}) is missing credentials. ${provider.configurationHint()}`,
    );
  }
  active = provider;
  return provider;
}

/** Test hook: forget the memoised provider so a new environment takes effect. */
export function resetProvider(): void {
  active = null;
}

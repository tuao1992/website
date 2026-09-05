/**
 * Answers lookups from reference files you supply — no API key, no third-party
 * call, no rate limit. See services/datasetLoader.ts for the accepted formats.
 *
 * Configure with GSTIN_DATASET_PATH (comma-separated paths).
 */

import { loadDataset, type LoadedDataset } from '../services/datasetLoader.js';
import { config } from '../config.js';
import type { GstinProvider, GstinRecord, ProviderResponse } from '../types.js';

export class DatasetProvider implements GstinProvider {
  readonly id = 'dataset';
  readonly name = 'Reference dataset (local files)';

  private dataset: LoadedDataset | null = null;
  private loading: Promise<LoadedDataset> | null = null;

  isConfigured(): boolean {
    return config.datasetPaths.length > 0;
  }

  configurationHint(): string {
    return 'Set GSTIN_DATASET_PATH to one or more CSV/XLSX/JSON files holding GSTINs you already know (vendor master, purchase register, GSTR-2A/2B export).';
  }

  /** Load once, and collapse concurrent first calls onto a single read. */
  private async ensureLoaded(): Promise<LoadedDataset> {
    if (this.dataset) return this.dataset;
    if (!this.loading) {
      this.loading = loadDataset(config.datasetPaths)
        .then((loaded) => {
          this.dataset = loaded;
          return loaded;
        })
        .finally(() => {
          this.loading = null;
        });
    }
    return this.loading;
  }

  /** Load eagerly at boot so a broken path fails on startup, not mid-batch. */
  async warmUp(): Promise<LoadedDataset> {
    return this.ensureLoaded();
  }

  stats(): { entries: number; files: Array<{ path: string; rows: number }>; skipped: number } | null {
    if (!this.dataset) return null;
    return { entries: this.dataset.byGstin.size, files: this.dataset.files, skipped: this.dataset.skipped };
  }

  async lookup(gstin: string): Promise<ProviderResponse> {
    const dataset = await this.ensureLoaded();

    const hit = dataset.byGstin.get(gstin);
    if (hit) return { kind: 'found', record: hit };

    // The GSTIN is absent, but another registration under the same PAN is present.
    // Same PAN means the same legal entity, so the legal name carries over — the
    // address does not, because this is a different state registration.
    const siblings = (dataset.byPan.get(gstin.slice(2, 12)) ?? []).filter((value) => value !== gstin);
    const sibling = siblings[0] ? dataset.byGstin.get(siblings[0]) : undefined;
    if (sibling?.legalName) {
      const record: GstinRecord = {
        ...sibling,
        gstin,
        tradeName: sibling.tradeName,
        // Everything registration-specific belongs to the sibling, not to this GSTIN.
        status: null,
        registrationDate: null,
        cancellationDate: null,
        lastUpdatedDate: null,
        centreJurisdiction: null,
        stateJurisdiction: null,
        principalAddress: null,
        additionalAddresses: [],
        verifiedBy: 'derived',
        provenance: `Legal name taken from ${siblings[0]}, a different registration under the same PAN. The address of this registration is not in the dataset.`,
        derived: sibling.derived,
        raw: undefined,
      };
      return {
        kind: 'derived',
        record,
        message:
          `Not in the dataset. Another registration under the same PAN (${siblings[0]}) supplies ` +
          `the legal name; the address of this registration is unknown.`,
      };
    }

    return {
      kind: 'not_found',
      message: `Not present in the reference dataset (${dataset.byGstin.size} GSTIN(s) loaded from ${dataset.files
        .map((file) => file.path.split('/').pop())
        .join(', ')})`,
      code: 'NOT_IN_DATASET',
    };
  }
}

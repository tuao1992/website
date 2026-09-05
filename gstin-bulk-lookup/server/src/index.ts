import { config } from './config.js';
import { createApp } from './app.js';
import { getDatasetProvider, getProvider } from './providers/index.js';

async function main(): Promise<void> {
  // Fail loudly at boot rather than on the first lookup.
  try {
    const provider = getProvider();
    console.log(`[gstin-bulk-lookup] data source: ${provider.name} (${provider.id})`);

    // Read the reference files now, so a bad path or a missing GSTIN column is
    // reported at startup instead of halfway through someone's batch.
    const dataset = getDatasetProvider();
    if (dataset) {
      const loaded = await dataset.warmUp();
      console.log(
        `[gstin-bulk-lookup] reference dataset: ${loaded.byGstin.size} GSTIN(s) from ` +
          `${loaded.files.map((file) => `${file.path} (${file.rows})`).join(', ')}` +
          (loaded.skipped > 0 ? ` — ${loaded.skipped} row(s) skipped for failing GSTIN validation` : ''),
      );
    }

    if (provider.id.split(',').includes('mock')) {
      console.warn(
        '[gstin-bulk-lookup] WARNING: the demo provider returns SYNTHETIC data. ' +
          'Use GSTIN_PROVIDER=dataset (your own reference files) or =local (validation only) ' +
          'if you need results you can trust without an API key.',
      );
    }
  } catch (error) {
    console.error(`[gstin-bulk-lookup] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[gstin-bulk-lookup] API listening on http://localhost:${config.port}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      console.log(`[gstin-bulk-lookup] ${signal} received, shutting down`);
      server.close(() => process.exit(0));
    });
  }
}

void main();

import { config } from './config.js';
import { createApp } from './app.js';
import { getProvider } from './providers/index.js';

function main(): void {
  // Fail loudly at boot rather than on the first lookup.
  try {
    const provider = getProvider();
    console.log(`[gstin-bulk-lookup] data source: ${provider.name} (${provider.id})`);
    if (provider.id === 'mock') {
      console.warn(
        '[gstin-bulk-lookup] WARNING: the demo provider returns SYNTHETIC data. ' +
          'Set GSTIN_PROVIDER and the matching credentials before relying on any result.',
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

main();

import type { AppConfig } from '../types';

/**
 * Says plainly where results come from. The distinction matters: demo records are
 * invented, "validated only" rows carry no business details at all, and dataset
 * rows are as current as the file you supplied.
 */
export function ProviderBanner({ config }: { config: AppConfig }): JSX.Element | null {
  const provider = config.provider;

  if (!provider.ready) {
    return (
      <div className="banner bad">
        <span className="banner-icon">!</span>
        <span>
          <strong>No data source configured</strong>
          {provider.error}
          <br />
          No API key? Set <code>GSTIN_PROVIDER=dataset</code> with{' '}
          <code>GSTIN_DATASET_PATH</code> pointing at a vendor list or GSTR-2A/2B export you already
          have, or <code>GSTIN_PROVIDER=local</code> to validate GSTINs and decode state, PAN and
          holder type without any credentials.
        </span>
      </div>
    );
  }

  if (provider.synthetic) {
    return (
      <div className="banner warn">
        <span className="banner-icon">!</span>
        <span>
          <strong>Demo mode — results are synthetic, not real GST records</strong>
          Without an API key you have two honest alternatives:{' '}
          <code>GSTIN_PROVIDER=dataset</code> resolves GSTINs from your own files (vendor master,
          purchase register, GSTR-2A/2B), and <code>GSTIN_PROVIDER=local</code> validates them and
          decodes state, PAN and holder type. See the README.
        </span>
      </div>
    );
  }

  if (provider.validationOnly) {
    return (
      <div className="banner info">
        <span className="banner-icon">i</span>
        <span>
          <strong>Validation only — no registry is configured</strong>
          Every GSTIN is checked for structure and check digit, and its state, PAN, holder type and
          registration class are decoded. Registered <em>name</em> and <em>address</em> are not
          encoded in a GSTIN and cannot be derived — add a reference dataset or an API key for those.
        </span>
      </div>
    );
  }

  const dataset = provider.dataset;
  if (dataset) {
    const names = dataset.files.map((file) => file.path.split(/[\\/]/).pop()).join(', ');
    return (
      <div className="banner info">
        <span className="banner-icon">i</span>
        <span>
          <strong>
            Serving from your reference data — {dataset.entries.toLocaleString('en-IN')} GSTIN
            {dataset.entries === 1 ? '' : 's'} loaded
          </strong>
          Source: {names}
          {dataset.skipped > 0 && ` · ${dataset.skipped} row(s) skipped for failing GSTIN validation`}
          {provider.id.includes(',') && ` · chain: ${provider.name}`}
        </span>
      </div>
    );
  }

  return null;
}

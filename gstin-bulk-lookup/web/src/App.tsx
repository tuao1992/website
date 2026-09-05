import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, downloadExport, fetchConfig, lookupStream, uploadFile } from './api';
import { DetailDrawer } from './components/DetailDrawer';
import { ExportMenu } from './components/ExportMenu';
import { InputPanel } from './components/InputPanel';
import { ResultsTable, useFilteredResults } from './components/ResultsTable';
import { SummaryBar, type StatusFilter } from './components/SummaryBar';
import type { AppConfig, ExportFormat, LookupResult, LookupSummary } from './types';

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  const stored = localStorage.getItem('gstin-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App(): JSX.Element {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [results, setResults] = useState<LookupResult[]>([]);
  const [summary, setSummary] = useState<LookupSummary | null>(null);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LookupResult | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [theme, setTheme] = useState<Theme>(initialTheme);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('gstin-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch((error: unknown) =>
        setConfigError(error instanceof Error ? error.message : 'Could not reach the lookup API'),
      );
  }, []);

  // Abort any in-flight batch if the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const runLookup = useCallback(async (gstins: string[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRunning(true);
    setLookupError(null);
    setExportError(null);
    setSelected(null);
    setResults([]);
    setSummary(null);
    setProgress({ completed: 0, total: gstins.length });

    // Buffer incoming rows and flush on a frame, so a 500-row batch does not
    // trigger 500 separate React renders.
    let pending: LookupResult[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (pending.length === 0) return;
      const batch = pending;
      pending = [];
      setResults((current) => [...current, ...batch]);
    };

    try {
      await lookupStream(
        gstins,
        {
          onResult: (result, completed, total) => {
            pending.push(result);
            setProgress({ completed, total });
            if (frame === 0) frame = requestAnimationFrame(flush);
          },
          onSummary: (value) => {
            if (frame !== 0) cancelAnimationFrame(frame);
            flush();
            setSummary(value);
          },
        },
        controller.signal,
      );
    } catch (error) {
      if (frame !== 0) cancelAnimationFrame(frame);
      flush();
      if (error instanceof DOMException && error.name === 'AbortError') {
        setLookupError('Lookup stopped. Rows resolved so far are shown below.');
      } else if (error instanceof ApiError) {
        setLookupError(error.message);
      } else {
        setLookupError(error instanceof Error ? error.message : 'Lookup failed');
      }
    } finally {
      setRunning(false);
      setProgress(null);
      abortRef.current = null;
    }
  }, []);

  const retryFailed = useCallback(() => {
    const failed = results.filter((result) => result.status === 'error').map((result) => result.gstin);
    if (failed.length > 0) void runLookup(failed);
  }, [results, runLookup]);

  const statusFiltered = useMemo(
    () => (filter === 'all' ? results : results.filter((result) => result.status === filter)),
    [results, filter],
  );
  const visible = useFilteredResults(statusFiltered, query);

  const onExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(format);
      setExportError(null);
      try {
        await downloadExport(format, visible, summary, `gstin-lookup-${new Date().toISOString().slice(0, 10)}`);
      } catch (error) {
        setExportError(error instanceof Error ? error.message : 'Export failed');
      } finally {
        setExporting(null);
      }
    },
    [visible, summary],
  );

  const failedCount = results.filter((result) => result.status === 'error').length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">GST</div>
        <div>
          <h1>GSTIN Bulk Lookup</h1>
          <div className="subtitle">Resolve many GSTINs to registered name, address and registration details</div>
        </div>
        <div className="header-spacer" />
        {config && (
          <span className="badge muted" title={config.provider.name}>
            Source: {config.provider.name}
          </span>
        )}
        <button
          type="button"
          className="ghost"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <main className="app-main">
        <InputPanel
          value={input}
          onChange={setInput}
          onLookup={(gstins) => void runLookup(gstins)}
          onCancel={() => abortRef.current?.abort()}
          running={running}
          progress={progress}
          maxBatchSize={config?.limits.maxBatchSize ?? 500}
          maxUploadBytes={config?.limits.maxUploadBytes ?? 10 * 1024 * 1024}
          onUpload={uploadFile}
        />

        <section>
          {configError && (
            <div className="banner bad">
              <span className="banner-icon">!</span>
              <span>
                <strong>The lookup API is unreachable</strong>
                {configError} — start the server with <code>npm run dev</code> in the project root.
              </span>
            </div>
          )}

          {config && !config.provider.ready && (
            <div className="banner bad">
              <span className="banner-icon">!</span>
              <span>
                <strong>Provider not configured</strong>
                {config.provider.error}
              </span>
            </div>
          )}

          {config?.provider.synthetic && (
            <div className="banner warn">
              <span className="banner-icon">!</span>
              <span>
                <strong>Demo mode — results are synthetic, not real GST records</strong>
                Set <code>GSTIN_PROVIDER</code> and the matching API credentials in <code>.env</code> to query a real
                GST data provider. See the README for the supported providers.
              </span>
            </div>
          )}

          {lookupError && (
            <div className="banner warn">
              <span className="banner-icon">!</span>
              <span>{lookupError}</span>
            </div>
          )}

          {exportError && (
            <div className="banner bad">
              <span className="banner-icon">!</span>
              <span>{exportError}</span>
            </div>
          )}

          {results.length > 0 && (
            <SummaryBar
              results={results}
              filter={filter}
              onFilter={setFilter}
              elapsedMs={summary?.durationMs ?? null}
            />
          )}

          <div className="panel">
            <div className="toolbar">
              <div className="grow">
                <input
                  type="search"
                  placeholder="Search name, city, PAN, GSTIN, error…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search results"
                />
              </div>
              {failedCount > 0 && !running && (
                <button type="button" onClick={retryFailed}>
                  Retry {failedCount} failed
                </button>
              )}
              <ExportMenu
                disabled={visible.length === 0 || running}
                busy={exporting}
                count={visible.length}
                onExport={(format) => void onExport(format)}
              />
            </div>

            <ResultsTable results={visible} query={query} selected={selected} onSelect={setSelected} />
          </div>
        </section>
      </main>

      <footer className="app-footer">
        GSTIN details are sourced from the configured GST data provider. Verify anything you rely on against the
        official GST portal at <a href="https://services.gst.gov.in/services/searchtp" target="_blank" rel="noreferrer">services.gst.gov.in</a>.
      </footer>

      {selected && <DetailDrawer result={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

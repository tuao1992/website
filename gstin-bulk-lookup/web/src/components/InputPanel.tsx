import { useCallback, useMemo, useRef, useState } from 'react';
import { quickCheck, tokenize } from '../lib/gstin';
import { formatBytes } from '../lib/format';
import type { UploadResponse } from '../types';

/** Structurally valid GSTINs used by "Load sample" to demonstrate the workflow. */
const SAMPLE = [
  '27AAPFU0939F1ZV',
  '09AAACH7409R1ZZ',
  '07AABCS1429B1ZW',
  '24AAACC9402D1Z8',
  '29AABCT3518Q1ZS',
  '33AAACT2727Q1Z3',
  '19AADCS0472N1ZZ',
  '06AAACI1195H1ZQ',
  '36AAECS3266L1Z0',
  '23AAFCD5862P1Z7',
  '32AABCK1936E1Z1',
  '08AACCG0527D1Z4',
  // Deliberately broken entries, so the sample also exercises error handling.
  '27AAPFU0939F1ZA',
  '29ABCDE1234',
].join('\n');

interface Props {
  value: string;
  onChange: (value: string) => void;
  onLookup: (gstins: string[]) => void;
  onCancel: () => void;
  running: boolean;
  progress: { completed: number; total: number } | null;
  maxBatchSize: number;
  maxUploadBytes: number;
  onUpload: (file: File) => Promise<UploadResponse>;
}

export function InputPanel(props: Props): JSX.Element {
  const { value, onChange, onLookup, onCancel, running, progress, maxBatchSize, maxUploadBytes, onUpload } = props;
  const [dragging, setDragging] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const tokens = useMemo(() => tokenize(value), [value]);
  const checks = useMemo(() => tokens.map((token) => quickCheck(token)), [tokens]);
  const invalid = useMemo(() => checks.filter((check) => !check.valid), [checks]);
  const validCount = checks.length - invalid.length;
  const overLimit = tokens.length > maxBatchSize;

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      setUploadNote(null);
      if (file.size > maxUploadBytes) {
        setUploadError(`${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(maxUploadBytes)}.`);
        return;
      }
      setUploading(true);
      try {
        const parsed = await onUpload(file);
        if (parsed.candidates.length === 0) {
          setUploadError(`No GSTIN-shaped values found in ${parsed.filename}. Check the file has a GSTIN column.`);
          return;
        }
        // Append rather than replace, so several files can be combined.
        onChange([value.trim(), parsed.candidates.join('\n')].filter(Boolean).join('\n'));
        const where =
          parsed.strategy === 'gstin-column'
            ? `column "${parsed.column}"`
            : `a scan of ${parsed.rowsScanned} row(s)`;
        setUploadNote(`Loaded ${parsed.candidates.length} GSTIN(s) from ${parsed.filename} via ${where}.`);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [maxUploadBytes, onChange, onUpload, value],
  );

  return (
    <section className="panel sticky-side">
      <div className="panel-head">
        <h2>1 · Add GSTINs</h2>
      </div>
      <div className="panel-body">
        <label className="field" htmlFor="gstin-input">
          Paste GSTINs — commas, spaces or one per line
        </label>
        <textarea
          id="gstin-input"
          value={value}
          spellCheck={false}
          autoCapitalize="characters"
          placeholder={'27AAPFU0939F1ZV\n09AAACH7409R1ZZ, 07AABCS1429B1ZW'}
          onChange={(event) => onChange(event.target.value)}
        />

        <div className="paste-meta">
          <span>
            <strong>{tokens.length}</strong> entr{tokens.length === 1 ? 'y' : 'ies'}
          </span>
          <span className="count-ok">{validCount} valid</span>
          {invalid.length > 0 && <span className="count-bad">{invalid.length} invalid</span>}
        </div>

        {invalid.length > 0 && (
          <div className="invalid-preview">
            <strong>These will be reported as invalid, not skipped:</strong>
            <ul>
              {invalid.slice(0, 6).map((check, index) => (
                <li key={`${check.gstin}-${index}`}>
                  <code>{check.gstin || '(blank)'}</code> — {check.reason}
                </li>
              ))}
              {invalid.length > 6 && <li>…and {invalid.length - 6} more</li>}
            </ul>
          </div>
        )}

        <div
          className={`dropzone${dragging ? ' dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
        >
          {uploading ? (
            'Reading file…'
          ) : (
            <>
              Drop a CSV or Excel file here, or{' '}
              <button type="button" className="link" onClick={() => fileInput.current?.click()}>
                browse
              </button>
              <span className="hint">
                .csv · .tsv · .txt · .xlsx — a column headed “GSTIN” is used when present, otherwise every cell is
                scanned. Max {formatBytes(maxUploadBytes)}.
              </span>
            </>
          )}
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            accept=".csv,.tsv,.txt,.xlsx,.xlsm,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = '';
            }}
          />
        </div>

        {uploadNote && <div className="banner info" style={{ marginTop: 12, marginBottom: 0 }}>{uploadNote}</div>}
        {uploadError && (
          <div className="banner bad" style={{ marginTop: 12, marginBottom: 0 }}>
            <span className="banner-icon">!</span>
            <span>{uploadError}</span>
          </div>
        )}

        {overLimit && (
          <div className="banner warn" style={{ marginTop: 12, marginBottom: 0 }}>
            <span className="banner-icon">!</span>
            <span>
              {tokens.length} entries exceed the per-batch limit of {maxBatchSize}. Remove some, or raise
              MAX_BATCH_SIZE on the server.
            </span>
          </div>
        )}

        <div className="button-row" style={{ marginTop: 14 }}>
          {running ? (
            <button type="button" className="primary" onClick={onCancel}>
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={tokens.length === 0 || overLimit}
              onClick={() => onLookup(tokens)}
            >
              Look up {tokens.length > 0 ? `${tokens.length} GSTIN${tokens.length === 1 ? '' : 's'}` : ''}
            </button>
          )}
          <button type="button" onClick={() => onChange(SAMPLE)} disabled={running}>
            Load sample
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              onChange('');
              setUploadNote(null);
              setUploadError(null);
            }}
            disabled={running || value === ''}
          >
            Clear
          </button>
        </div>

        {progress && (
          <div className="progress">
            <div className="progress-bar">
              <span style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} />
            </div>
            <div className="progress-label">
              <span>
                {progress.completed} of {progress.total} resolved
              </span>
              <span>{Math.round(progress.total ? (progress.completed / progress.total) * 100 : 0)}%</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

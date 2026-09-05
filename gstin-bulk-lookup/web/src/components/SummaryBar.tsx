import type { LookupResult, LookupStatus } from '../types';
import { formatDuration } from '../lib/format';

export type StatusFilter = 'all' | LookupStatus;

interface Props {
  results: LookupResult[];
  filter: StatusFilter;
  onFilter: (filter: StatusFilter) => void;
  elapsedMs: number | null;
}

/** Clickable counters that double as the status filter. */
export function SummaryBar({ results, filter, onFilter, elapsedMs }: Props): JSX.Element {
  const count = (status: LookupStatus) => results.filter((result) => result.status === status).length;

  const cards: Array<{ key: StatusFilter; label: string; value: number; tone?: string }> = [
    { key: 'all', label: 'Total', value: results.length },
    { key: 'success', label: 'Found', value: count('success'), tone: 'ok' },
    // Only meaningful when a keyless source answered; hidden otherwise.
    ...(count('derived') > 0
      ? [{ key: 'derived' as StatusFilter, label: 'Validated only', value: count('derived'), tone: 'info' }]
      : []),
    { key: 'not_found', label: 'Not found', value: count('not_found'), tone: 'warn' },
    { key: 'invalid', label: 'Invalid GSTIN', value: count('invalid'), tone: 'bad' },
    { key: 'error', label: 'Lookup failed', value: count('error'), tone: 'bad' },
  ];

  return (
    <div className="stat-row">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          className={`stat${card.tone ? ` ${card.tone}` : ''}${filter === card.key ? ' active' : ''}`}
          aria-pressed={filter === card.key}
          onClick={() => onFilter(filter === card.key && card.key !== 'all' ? 'all' : card.key)}
        >
          <span className="value">{card.value}</span>
          <span className="label">{card.label}</span>
        </button>
      ))}
      {elapsedMs !== null && (
        <div className="stat" style={{ cursor: 'default' }}>
          <span className="value" style={{ fontSize: 16 }}>
            {formatDuration(elapsedMs)}
          </span>
          <span className="label">Elapsed</span>
        </div>
      )}
    </div>
  );
}

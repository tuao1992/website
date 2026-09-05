import { useMemo, useState } from 'react';
import type { LookupResult } from '../types';
import { STATUS_LABEL, STATUS_TONE, dash, gstStatusTone, searchHaystack } from '../lib/format';

export type SortKey = 'input' | 'gstin' | 'legalName' | 'status' | 'gstStatus' | 'state' | 'city' | 'registrationDate';

const SORT_VALUE: Record<SortKey, (result: LookupResult) => string> = {
  input: (r) => r.input,
  gstin: (r) => r.gstin,
  legalName: (r) => r.record?.legalName ?? '',
  status: (r) => STATUS_LABEL[r.status],
  gstStatus: (r) => r.record?.status ?? '',
  state: (r) => r.record?.principalAddress?.state ?? r.record?.derived?.stateName ?? '',
  city: (r) => r.record?.principalAddress?.city ?? '',
  registrationDate: (r) => {
    // GSTN returns DD/MM/YYYY; reorder so a plain string sort is chronological.
    const value = r.record?.registrationDate ?? '';
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    return match ? `${match[3]}${match[2]}${match[1]}` : value;
  },
};

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'gstin', label: 'GSTIN' },
  { key: 'status', label: 'Result' },
  { key: 'legalName', label: 'Business name' },
  { key: 'gstStatus', label: 'GST status' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'registrationDate', label: 'Registered' },
];

interface Props {
  results: LookupResult[];
  query: string;
  selected: LookupResult | null;
  onSelect: (result: LookupResult) => void;
}

export function useFilteredResults(results: LookupResult[], query: string): LookupResult[] {
  return useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return results;
    return results.filter((result) => searchHaystack(result).includes(needle));
  }, [results, query]);
}

export function ResultsTable({ results, query, selected, onSelect }: Props): JSX.Element {
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return results;
    const read = SORT_VALUE[sort.key];
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...results].sort((a, b) => {
      const left = read(a);
      const right = read(b);
      // Rows with no value sort last in either direction, so blanks never lead.
      if (left === '' && right !== '') return 1;
      if (right === '' && left !== '') return -1;
      return left.localeCompare(right, 'en') * factor;
    });
  }, [results, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  if (results.length === 0) {
    return (
      <div className="empty">
        <h3>{query ? 'No rows match your search' : 'No results yet'}</h3>
        <p>
          {query
            ? 'Try a different business name, city, PAN or GSTIN.'
            : 'Paste GSTINs or upload a spreadsheet on the left, then run the lookup.'}
        </p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="results">
        <thead>
          <tr>
            {COLUMNS.map((column) => {
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  className="sortable"
                  aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onClick={() => toggleSort(column.key)}
                >
                  {column.label}
                  {active ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              );
            })}
            <th>Registered address / message</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((result, index) => {
            const record = result.record;
            const rowClass = [
              selected?.input === result.input && selected?.gstin === result.gstin ? 'selected' : '',
              result.status === 'invalid' || result.status === 'error' ? 'row-bad' : '',
              result.status === 'not_found' ? 'row-warn' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <tr
                key={`${result.gstin}-${index}`}
                className={rowClass}
                tabIndex={0}
                onClick={() => onSelect(result)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(result);
                  }
                }}
              >
                <td className="gstin">{result.gstin || result.input}</td>
                <td className="nowrap">
                  <span className={`badge ${STATUS_TONE[result.status]}`}>{STATUS_LABEL[result.status]}</span>
                </td>
                <td className="name">
                  {dash(record?.legalName)}
                  {record?.tradeName && record.tradeName !== record.legalName && (
                    <span className="trade">{record.tradeName}</span>
                  )}
                </td>
                <td className="nowrap">
                  {record?.status ? (
                    <span className={`badge ${gstStatusTone(record.status)}`}>{record.status}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{dash(record?.principalAddress?.state ?? record?.derived?.stateName)}</td>
                <td>{dash(record?.principalAddress?.city)}</td>
                <td className="nowrap">{dash(record?.registrationDate)}</td>
                {result.status === 'success' ? (
                  <td className="address">{dash(record?.principalAddress?.formatted)}</td>
                ) : (
                  <td className="msg">{dash(result.message)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

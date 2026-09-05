import { useEffect, useRef, useState } from 'react';
import type { ExportFormat } from '../types';

const OPTIONS: Array<{ format: ExportFormat; label: string; hint: string }> = [
  { format: 'xlsx', label: 'Excel workbook (.xlsx)', hint: 'Results sheet + summary, with filters' },
  { format: 'csv', label: 'CSV (.csv)', hint: 'All 30 columns, UTF-8 with BOM' },
  { format: 'pdf', label: 'PDF report (.pdf)', hint: 'Landscape table + failures section' },
  { format: 'json', label: 'JSON (.json)', hint: 'Full records including provider payload' },
];

interface Props {
  disabled: boolean;
  busy: ExportFormat | null;
  /** Number of rows that will be exported, i.e. what is currently filtered in. */
  count: number;
  onExport: (format: ExportFormat) => void;
}

export function ExportMenu({ disabled, busy, count, onExport }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={wrap}>
      <button type="button" disabled={disabled} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)}>
        {busy ? `Preparing ${busy.toUpperCase()}…` : `Export ${count} row${count === 1 ? '' : 's'} ▾`}
      </button>
      {open && (
        <div className="menu" role="menu">
          {OPTIONS.map((option) => (
            <button
              key={option.format}
              type="button"
              role="menuitem"
              disabled={busy !== null}
              onClick={() => {
                setOpen(false);
                onExport(option.format);
              }}
            >
              {option.label}
              <small>{option.hint}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

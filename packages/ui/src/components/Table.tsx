import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface TableColumn<TRow> {
  key: string;
  header: string;
  render: (row: TRow) => ReactNode;
  /** Sortable columns get a real button in the header cell, not a clickable <th> (keyboard + AT support). */
  onSort?: () => void;
  sortDirection?: 'asc' | 'desc' | null;
}

export interface TableProps<TRow> {
  caption: string;
  columns: Array<TableColumn<TRow>>;
  rows: TRow[];
  getRowId: (row: TRow) => string;
  emptyMessage?: string;
}

/**
 * A real `<table>` with `<caption>`, scoped headers, and sort controls that
 * are actual buttons — dense enterprise data grids are still, structurally,
 * tables; div-grids lose semantics AT users depend on.
 */
export function Table<TRow>({
  caption,
  columns,
  rows,
  getRowId,
  emptyMessage = 'No records.',
}: TableProps<TRow>) {
  return (
    <table className="w-full border-collapse text-sm text-fg">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-border text-left">
          {columns.map((col) => (
            <th key={col.key} scope="col" className="px-3 py-2 font-medium text-muted">
              {col.onSort ? (
                <button
                  type="button"
                  onClick={col.onSort}
                  className={cn(
                    'inline-flex items-center gap-1 font-medium text-muted hover:text-fg',
                  )}
                  aria-sort={
                    col.sortDirection === 'asc'
                      ? 'ascending'
                      : col.sortDirection === 'desc'
                        ? 'descending'
                        : 'none'
                  }
                >
                  {col.header}
                </button>
              ) : (
                col.header
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-3 py-6 text-center text-muted">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={getRowId(row)} className="border-b border-border last:border-0">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

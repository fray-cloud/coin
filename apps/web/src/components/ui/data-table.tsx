'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  sortable?: boolean;
  sortFn?: (a: T, b: T) => number;
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  filterFn?: (row: T, text: string) => boolean;
  filterPlaceholder?: string;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No data',
  onRowClick,
  className,
  filterFn,
  filterPlaceholder = 'Search...',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterText, setFilterText] = useState('');

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const processed = useMemo(() => {
    let result = [...data];

    // Filter
    if (filterText && filterFn) {
      result = result.filter((row) => filterFn(row, filterText));
    }

    // Sort
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortable) {
        const fn =
          col.sortFn ||
          ((a: T, b: T) => {
            const va = String((a as Record<string, unknown>)[col.key] ?? '');
            const vb = String((b as Record<string, unknown>)[col.key] ?? '');
            return va.localeCompare(vb);
          });
        result.sort((a, b) => {
          const cmp = fn(a, b);
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }

    return result;
  }, [data, sortKey, sortDir, filterText, filterFn, columns]);

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-foreground" />
    ) : (
      <ArrowDown size={12} className="text-foreground" />
    );
  };

  return (
    <div className={cn('space-y-3', className)}>
      {filterFn && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={filterPlaceholder}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'pb-2 font-medium',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable && 'cursor-pointer select-none hover:text-foreground',
                    col.className,
                  )}
                  onClick={() => handleSort(col)}
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1',
                      col.align === 'right' && 'flex-row-reverse',
                    )}
                  >
                    {col.header}
                    {col.sortable && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              processed.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className={cn(
                    'border-b last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-muted/50',
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'py-2',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className,
                      )}
                    >
                      {col.render(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

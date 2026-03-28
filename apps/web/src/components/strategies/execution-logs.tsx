'use client';

import { useState, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStrategyLogs } from '@/lib/api-client';
import { SIGNAL_STYLES } from '@/lib/constants';

const ACTION_BADGE_VARIANT: Record<string, 'info' | 'success' | 'warning' | 'error' | 'muted'> = {
  signal_generated: 'info',
  order_placed: 'success',
  risk_blocked: 'warning',
  error: 'error',
};

interface ExecutionLogsProps {
  strategyId: string;
}

export function ExecutionLogs({ strategyId }: ExecutionLogsProps) {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [signalFilter, setSignalFilter] = useState<string>('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const {
    data: logsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['strategyLogs', strategyId],
    queryFn: ({ pageParam }) => getStrategyLogs(strategyId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 5_000,
  });

  const logs = logsData?.pages.flatMap((p) => p.items) ?? [];

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (actionFilter !== 'all') result = result.filter((l) => l.action === actionFilter);
    if (signalFilter !== 'all') result = result.filter((l) => l.signal === signalFilter);
    result = [...result].sort((a, b) => {
      const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [logs, actionFilter, signalFilter, sortDir]);

  const actionOptions = [
    'all',
    'signal_generated',
    'order_placed',
    'risk_blocked',
    'error',
  ] as const;
  const signalOptions = ['all', 'buy', 'sell'] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Execution Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <div>
            <span className="text-xs text-muted-foreground mr-2">Action:</span>
            <div className="flex gap-1 flex-wrap mb-3">
              {actionOptions.map((a) => (
                <Button
                  key={a}
                  variant={actionFilter === a ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActionFilter(a)}
                >
                  {a === 'all' ? 'All' : a.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground mr-2">Signal:</span>
            <div className="flex gap-1 flex-wrap mb-3">
              {signalOptions.map((s) => (
                <Button
                  key={s}
                  variant={signalFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSignalFilter(s)}
                >
                  {s === 'all' ? 'All' : s}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th
                    className="pb-2 font-medium cursor-pointer select-none"
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  >
                    Time
                    {sortDir === 'asc' ? (
                      <ArrowUp size={14} className="inline ml-1" />
                    ) : (
                      <ArrowDown size={14} className="inline ml-1" />
                    )}
                  </th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Signal</th>
                  <th className="pb-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const details = log.details as Record<string, unknown>;
                  return (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2">
                        <Badge variant={ACTION_BADGE_VARIANT[log.action] || 'muted'}>
                          {log.action.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2">
                        {log.signal ? (
                          <span className={SIGNAL_STYLES[log.signal] || ''}>
                            {log.signal.toUpperCase()}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground max-w-xs truncate">
                        {Object.entries(details)
                          .filter(([k]) => k !== 'error')
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                        {details.error && (
                          <span className="text-destructive">{String(details.error)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No logs yet. Enable the strategy to start receiving signals.
          </p>
        )}

        {hasNextPage && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

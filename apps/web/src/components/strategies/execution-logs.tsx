'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Execution Logs</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Signal</th>
                  <th className="pb-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
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

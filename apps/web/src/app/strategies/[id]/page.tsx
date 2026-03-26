'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getStrategy, getStrategyLogs, toggleStrategy, deleteStrategy } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import { StrategyChart } from '@/components/strategy-chart';

const ACTION_STYLES: Record<string, string> = {
  signal_generated: 'bg-blue-100 text-blue-800',
  order_placed: 'bg-green-100 text-green-800',
  risk_blocked: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
};

const SIGNAL_STYLES: Record<string, string> = {
  buy: 'text-green-600 font-medium',
  sell: 'text-red-600 font-medium',
};

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ACTION_STYLES[action] || 'bg-gray-100 text-gray-600'}`}
    >
      {action.replace('_', ' ')}
    </span>
  );
}

export default function StrategyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: strategy, isLoading } = useQuery({
    queryKey: ['strategy', id],
    queryFn: () => getStrategy(id),
  });

  const {
    data: logsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['strategyLogs', id],
    queryFn: ({ pageParam }) => getStrategyLogs(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 5_000,
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy', id] });
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteStrategy(id),
    onSuccess: () => {
      router.push('/strategies');
    },
  });

  const logs = logsData?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">Strategy not found</p>
      </div>
    );
  }

  const config = strategy.config as Record<string, unknown>;
  const riskConfig = strategy.riskConfig as Record<string, unknown>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/strategies" className="hover:underline">
          Strategies
        </Link>
        <span>/</span>
        <span>{strategy.name}</span>
      </div>

      {/* Strategy Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{strategy.name}</CardTitle>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleMutation.mutate()}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  strategy.enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    strategy.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm">{strategy.enabled ? 'Enabled' : 'Disabled'}</span>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => deleteMutation.mutate()}
              >
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium">{strategy.type.toUpperCase()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Exchange</span>
              <p className="font-medium capitalize">{strategy.exchange}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Symbol</span>
              <p className="font-medium">{strategy.symbol}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Interval</span>
              <p className="font-medium">{strategy.intervalSeconds}s</p>
            </div>
            <div>
              <span className="text-muted-foreground">Mode</span>
              <p
                className={`font-medium ${strategy.mode === 'auto' ? 'text-green-600' : 'text-blue-600'}`}
              >
                {strategy.mode}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Trading</span>
              <p
                className={`font-medium ${strategy.tradingMode === 'paper' ? 'text-purple-600' : 'text-orange-600'}`}
              >
                {strategy.tradingMode}
              </p>
            </div>
          </div>

          {/* Config details */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Parameters</p>
              <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                {Object.entries(config).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            {Object.keys(riskConfig).length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Risk Management</p>
                <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                  {Object.entries(riskConfig).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Strategy Chart with Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ExchangeIcon exchange={strategy.exchange} size={18} />
            <CoinIcon symbol={strategy.symbol} size={18} />
            {strategy.exchange.toUpperCase()} — {strategy.symbol}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StrategyChart
            exchange={strategy.exchange}
            symbol={strategy.symbol}
            strategyType={strategy.type}
            config={config}
          />
        </CardContent>
      </Card>

      {/* Execution Logs */}
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
                          <ActionBadge action={log.action} />
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
    </div>
  );
}

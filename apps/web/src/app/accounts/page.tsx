'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { ExchangeIcon } from '@/components/icons';
import {
  getExchangeKeys,
  createExchangeKey,
  deleteExchangeKey,
  getBalances,
  type ExchangeKeyItem,
  type BalanceItem,
} from '@/lib/api-client';

const EXCHANGES = [
  { value: 'upbit', label: 'Upbit' },
  { value: 'binance', label: 'Binance' },
  { value: 'bybit', label: 'Bybit' },
];

function ExchangeLabel({ exchange }: { exchange: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
      <ExchangeIcon exchange={exchange} size={14} />
      {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
    </span>
  );
}

function BalanceTable({ keyItem }: { keyItem: ExchangeKeyItem }) {
  const t = useTranslations('accounts');
  const [showAll, setShowAll] = useState(false);

  const {
    data: balances,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['balances', keyItem.id],
    queryFn: () => getBalances(keyItem.id),
    staleTime: 30_000,
  });

  const filtered = balances?.filter(
    (b) => showAll || parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExchangeLabel exchange={keyItem.exchange} />
          <span className="text-xs text-muted-foreground">
            {new Date(keyItem.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded"
            />
            {t('showAll')}
          </label>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            {t('refresh')}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load balances'}
        </p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">{t('currency')}</th>
                <th className="pb-2 font-medium text-right">{t('available')}</th>
                <th className="pb-2 font-medium text-right">{t('locked')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.currency} className="border-b last:border-0">
                  <td className="py-1.5 font-medium">{b.currency}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.free}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {b.locked}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered && filtered.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">{t('noBalances')}</p>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const t = useTranslations('accounts');
  const queryClient = useQueryClient();
  const [exchange, setExchange] = useState('upbit');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');

  const { data: keys = [], isLoading: keysLoading } = useQuery({
    queryKey: ['exchangeKeys'],
    queryFn: getExchangeKeys,
  });

  const createMutation = useMutation({
    mutationFn: createExchangeKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeKeys'] });
      setApiKey('');
      setSecretKey('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExchangeKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeKeys'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate({ exchange, apiKey, secretKey });
  };

  const registeredExchanges = new Set(keys.map((k) => k.exchange));

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Add Key Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('registerKey')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exchange">{t('exchange')}</Label>
              <select
                id="exchange"
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {EXCHANGES.map((ex) => (
                  <option
                    key={ex.value}
                    value={ex.value}
                    disabled={registeredExchanges.has(ex.value)}
                  >
                    {ex.label} {registeredExchanges.has(ex.value) ? `(${t('registered')})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">{t('apiKey')}</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('enterApiKey')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretKey">{t('secretKey')}</Label>
              <Input
                id="secretKey"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={t('enterSecretKey')}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t('validating') : t('register')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Exchange Keys + Balances */}
      {keysLoading && <p className="text-muted-foreground">{t('loadingKeys')}</p>}

      {keys.map((keyItem) => (
        <Card key={keyItem.id}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <BalanceTable keyItem={keyItem} />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive shrink-0 ml-4"
                onClick={() => {
                  if (confirm(t('deleteConfirm', { exchange: keyItem.exchange }))) {
                    deleteMutation.mutate(keyItem.id);
                  }
                }}
              >
                {t('delete')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!keysLoading && keys.length === 0 && (
        <p className="text-center text-muted-foreground py-8">{t('noKeys')}</p>
      )}
    </div>
  );
}

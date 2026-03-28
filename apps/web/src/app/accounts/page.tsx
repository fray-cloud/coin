'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { createExchangeKey, deleteExchangeKey } from '@/lib/api-client';
import { EXCHANGES } from '@/lib/constants';
import { useExchangeKeys } from '@/hooks/use-exchange-keys';
import { BalanceTable } from '@/components/accounts/balance-table';

export default function AccountsPage() {
  const t = useTranslations('accounts');
  const queryClient = useQueryClient();
  const [exchange, setExchange] = useState('upbit');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');

  const { data: keys = [], isLoading: keysLoading } = useExchangeKeys();

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
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

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

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toggleStrategy, deleteStrategy } from '@/lib/api-client';
import { useStrategies } from '@/hooks/use-strategies';
import { useExchangeKeys } from '@/hooks/use-exchange-keys';
import { StrategyCard } from '@/components/strategies/strategy-card';
import { CreateStrategyForm } from '@/components/strategies/create-strategy-form';

export default function StrategiesPage() {
  const t = useTranslations('strategies');
  const queryClient = useQueryClient();
  const { data: strategies = [], isLoading } = useStrategies();
  const { data: keys = [] } = useExchangeKeys();

  const toggleMutation = useMutation({
    mutationFn: toggleStrategy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStrategy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CreateStrategyForm
            keys={keys}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['strategies'] })}
          />
        </div>
        <div className="lg:col-span-2 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && strategies.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t('noStrategies')}</p>
          )}
          {strategies.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              onToggle={() => toggleMutation.mutate(s.id)}
              onDelete={() => deleteMutation.mutate(s.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

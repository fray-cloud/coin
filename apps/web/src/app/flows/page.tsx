'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Workflow } from 'lucide-react';
import { createFlow, deleteFlow } from '@/lib/api-client';
import { useFlows } from '@/hooks/use-flows';
import { useToastStore } from '@/stores/use-toast-store';
import { FlowCard } from '@/components/flows/flow-card';
import { SkeletonCard } from '@/components/ui/skeleton';

export default function FlowsPage() {
  const t = useTranslations('flows');
  const router = useRouter();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { data: flows = [], isLoading } = useFlows();

  const createMutation = useMutation({
    mutationFn: () =>
      createFlow({
        name: '새 플로우',
        definition: { nodes: [], edges: [] },
        exchange: 'binance',
        symbol: 'BTC/USDT',
      }),
    onSuccess: (flow) => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      router.push(`/flows/${flow.id}`);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: '생성 실패', message: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      addToast({ type: 'success', title: '삭제됨', message: '플로우가 삭제되었습니다.' });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus size={16} />
          {t('newFlow')}
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && flows.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Workflow size={48} className="text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">{t('noFlows')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('emptyDesc')}</p>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary/90"
          >
            {t('createFirst')}
          </button>
        </div>
      )}

      {flows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onDelete={() => {
                if (confirm(t('deleteConfirm'))) {
                  deleteMutation.mutate(flow.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

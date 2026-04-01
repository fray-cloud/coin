'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useFlow } from '@/hooks/use-flows';
import { useUser } from '@/hooks/use-user';
import { useBacktestWs } from '@/hooks/use-backtest-ws';
import { useFlowStore } from '@/stores/use-flow-store';

const FlowCanvas = dynamic(
  () => import('@/components/flows/flow-canvas').then((m) => ({ default: m.FlowCanvas })),
  { ssr: false },
);

import { NodePalette } from '@/components/flows/node-palette';
import { NodeInspector } from '@/components/flows/node-inspector';
import { FlowToolbar } from '@/components/flows/flow-toolbar';
import { TimelineSlider } from '@/components/flows/timeline-slider';

export default function FlowBuilderPage() {
  const t = useTranslations('flows');
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const { data: flow, isLoading } = useFlow(id);
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const flowId = useFlowStore((s) => s.flowId);

  // Listen for backtest completion via WebSocket
  useBacktestWs(user?.id ?? null, id);

  // Load flow data into store when fetched
  useEffect(() => {
    if (flow && flow.id !== flowId) {
      loadFlow(flow.id, flow.name, flow.definition);
    }
  }, [flow, flowId, loadFlow]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-sm text-muted-foreground">{t('loading', { ns: 'common' })}</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Mobile read-only banner */}
      <div className="block border-b border-amber-800 bg-amber-900/20 px-4 py-2 text-center text-xs text-amber-400 lg:hidden">
        {t('mobileReadOnly')}
      </div>

      <FlowToolbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <NodePalette />
        </div>

        <FlowCanvas />

        <div className="hidden lg:block">
          <NodeInspector />
        </div>
      </div>

      <TimelineSlider />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Play, Loader2 } from 'lucide-react';
import { useFlowStore } from '@/stores/use-flow-store';
import { useToastStore } from '@/stores/use-toast-store';
import { updateFlow, requestBacktest } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';

export function FlowToolbar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const flowId = useFlowStore((s) => s.flowId);
  const flowName = useFlowStore((s) => s.flowName);
  const isDirty = useFlowStore((s) => s.isDirty);
  const toDefinition = useFlowStore((s) => s.toDefinition);
  const markClean = useFlowStore((s) => s.markClean);
  const setFlowName = useFlowStore((s) => s.setFlowName);
  const setActiveBacktest = useFlowStore((s) => s.setActiveBacktest);
  const backtestStatus = useFlowStore((s) => s.backtestStatus);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!flowId) return;
    setSaving(true);
    try {
      await updateFlow(flowId, {
        name: flowName,
        definition: toDefinition(),
      });
      markClean();
      queryClient.invalidateQueries({ queryKey: ['flow', flowId] });
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      addToast({ type: 'success', title: '저장됨', message: '플로우가 저장되었습니다.' });
    } catch (err: any) {
      addToast({ type: 'error', title: '저장 실패', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleBacktest = async () => {
    if (!flowId) return;
    // Save first if dirty
    if (isDirty) await handleSave();

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const { backtestId } = await requestBacktest(flowId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setActiveBacktest(backtestId, 'pending');
      queryClient.invalidateQueries({ queryKey: ['backtests', flowId] });
      addToast({
        type: 'info',
        title: '백테스트 시작',
        message: '백테스트가 요청되었습니다. 완료 시 알림을 받습니다.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: '백테스트 실패', message: err.message });
    }
  };

  const backtestRunning = backtestStatus === 'pending' || backtestStatus === 'running';

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/flows')}
          className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="뒤로"
        >
          <ArrowLeft size={18} />
        </button>
        <input
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          className="border-b border-transparent bg-transparent text-sm font-medium text-foreground outline-none focus:border-primary"
          placeholder="플로우 이름"
        />
        {isDirty && <span className="text-[10px] text-amber-400">수정됨</span>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted/80 disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          저장
        </button>
        <button
          onClick={handleBacktest}
          disabled={backtestRunning}
          className="flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs text-white transition hover:bg-emerald-600 disabled:opacity-40"
        >
          {backtestRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          백테스트
        </button>
      </div>
    </div>
  );
}

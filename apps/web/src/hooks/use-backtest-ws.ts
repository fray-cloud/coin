'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useFlowStore } from '@/stores/use-flow-store';
import { useToastStore } from '@/stores/use-toast-store';
import { getBacktestTrace } from '@/lib/api-client';

/**
 * Listens for backtest:completed WebSocket events.
 * When the active backtest completes, loads trace data into the flow store.
 */
export function useBacktestWs(userId: string | null, flowId: string | null) {
  const queryClient = useQueryClient();
  const setActiveBacktest = useFlowStore((s) => s.setActiveBacktest);
  const setTraceData = useFlowStore((s) => s.setTraceData);
  const activeBacktestId = useFlowStore((s) => s.activeBacktestId);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!userId || !flowId) return;

    const socket = io({
      path: '/ws',
      transports: ['websocket'],
      query: { userId },
    });

    socket.on(
      'backtest:completed',
      async (data: {
        backtestId: string;
        flowId: string;
        status: 'completed' | 'failed';
        error?: string;
      }) => {
        // Only process events for our flow
        if (data.flowId !== flowId) return;

        queryClient.invalidateQueries({ queryKey: ['backtests', flowId] });
        queryClient.invalidateQueries({ queryKey: ['flow', flowId] });

        if (data.status === 'completed') {
          setActiveBacktest(data.backtestId, 'completed');
          addToast({
            type: 'success',
            title: '백테스트 완료',
            message: '결과를 확인하세요. 타임라인을 스크러빙할 수 있습니다.',
          });

          // Load trace data
          try {
            const traceResponse = await getBacktestTrace(flowId, data.backtestId, {
              limit: 10000,
            });
            setTraceData(traceResponse.items);
          } catch {
            // Trace loading failed but backtest completed
          }
        } else {
          setActiveBacktest(data.backtestId, 'failed');
          addToast({
            type: 'error',
            title: '백테스트 실패',
            message: data.error || '백테스트 실행 중 오류가 발생했습니다.',
          });
        }
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [userId, flowId, queryClient, setActiveBacktest, setTraceData, addToast]);
}

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PnlValue } from '@/components/shared/pnl-value';
import { PnlChart } from '@/components/shared/pnl-chart';
import { useStrategyPerformance } from '@/hooks/use-strategy-performance';

interface PerformanceCardProps {
  strategyId: string;
  mode: string;
}

export function PerformanceCard({ strategyId, mode }: PerformanceCardProps) {
  const { data: performance } = useStrategyPerformance(strategyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Performance
          {mode === 'signal' && (
            <span className="text-xs font-normal text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
              시뮬레이션
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {performance && performance.totalTrades > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">총 거래</p>
                <p className="text-xl font-bold">{performance.totalTrades}</p>
                <p className="text-xs text-muted-foreground">
                  매수 {performance.buyTrades} / 매도 {performance.sellTrades}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">승률</p>
                <p
                  className={`text-xl font-bold ${performance.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {performance.winRate}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {performance.wins}승 {performance.losses}패
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">실현 손익</p>
                <p className="text-xl">
                  <PnlValue value={performance.realizedPnl} />
                </p>
              </div>
            </div>
            {performance.dailyPnl.length > 0 && (
              <PnlChart data={performance.dailyPnl} height={150} />
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-6">
            아직 거래 기록이 없습니다. 전략을 활성화하면 수익이 여기에 표시됩니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

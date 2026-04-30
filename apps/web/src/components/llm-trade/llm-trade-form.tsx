'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requestSignal, executeTrade, type SignalResponse } from '@/lib/api-client';

const TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'] as const;
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

interface SignalState {
  response: SignalResponse;
  tpOverride: string;
  slOverride: string;
}

export function LlmTradeForm() {
  const [symbol, setSymbol] = useState<(typeof TOP_SYMBOLS)[number]>('BTCUSDT');
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>('5m');
  const [candleCount, setCandleCount] = useState(50);
  const [betUsdt, setBetUsdt] = useState(50);
  const [leverage, setLeverage] = useState(5);
  const [signal, setSignal] = useState<SignalState | null>(null);
  const [error, setError] = useState('');

  const signalMutation = useMutation({
    mutationFn: requestSignal,
    onSuccess: (response) => {
      setSignal({
        response,
        tpOverride: response.takeProfitPrice,
        slOverride: response.stopLossPrice,
      });
      setError('');
    },
    onError: (err: Error) => {
      setSignal(null);
      setError(err.message);
    },
  });

  const executeMutation = useMutation({
    mutationFn: executeTrade,
    onError: (err: Error) => setError(err.message),
  });

  const handleSignal = () => {
    setError('');
    signalMutation.mutate({ symbol, interval, candleCount });
  };

  const handleExecute = () => {
    if (!signal) return;
    if (
      !window.confirm(
        `${signal.response.signal.toUpperCase()} ${symbol} ${leverage}x\nbet ${betUsdt} USDT, TP ${signal.tpOverride}, SL ${signal.slOverride}\n\n실행하시겠습니까?`,
      )
    )
      return;
    executeMutation.mutate({
      symbol,
      side: signal.response.signal,
      betUsdt,
      leverage,
      takeProfitPrice: signal.tpOverride,
      stopLossPrice: signal.slOverride,
      entryPrice: signal.response.entryPrice,
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">LLM Trade</h1>
      <p className="text-sm text-muted-foreground">
        Claude가 캔들 데이터를 분석해 long/short + TP/SL을 제안합니다. 응답을 확인한 뒤 거래를
        실행하세요.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. 신호 요청</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">심볼</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value as (typeof TOP_SYMBOLS)[number])}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TOP_SYMBOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">봉 (X)</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value as (typeof INTERVALS)[number])}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {INTERVALS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">캔들 개수 (Y)</label>
              <input
                type="number"
                min={20}
                max={200}
                value={candleCount}
                onChange={(e) => setCandleCount(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">레버리지 (xZ)</label>
              <input
                type="number"
                min={1}
                max={20}
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-muted-foreground mb-1">
                베팅비용 (USDT, 증거금)
              </label>
              <input
                type="number"
                min={1}
                value={betUsdt}
                onChange={(e) => setBetUsdt(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <Button onClick={handleSignal} disabled={signalMutation.isPending}>
            {signalMutation.isPending ? 'Claude 분석 중...' : 'Signal 받기'}
          </Button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {signal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. LLM 응답</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-bold ${
                  signal.response.signal === 'long' ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {signal.response.signal.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground">
                ({signal.response.latencyMs}ms · {signal.response.model})
              </span>
            </div>
            <p className="text-sm">{signal.response.reasoning}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  진입가 (lastClose)
                </label>
                <input
                  readOnly
                  value={signal.response.entryPrice}
                  className="w-full h-9 px-3 rounded-md border border-input bg-muted/50 text-sm font-mono"
                />
              </div>
              <div></div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  TP (override 가능)
                </label>
                <input
                  type="text"
                  value={signal.tpOverride}
                  onChange={(e) => setSignal({ ...signal, tpOverride: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  SL (override 가능)
                </label>
                <input
                  type="text"
                  value={signal.slOverride}
                  onChange={(e) => setSignal({ ...signal, slOverride: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <Button onClick={handleExecute} disabled={executeMutation.isPending} className="w-full">
              {executeMutation.isPending
                ? '거래 실행 중...'
                : `거래 실행 (${signal.response.signal.toUpperCase()} ${leverage}x)`}
            </Button>
            {executeMutation.data && (
              <p className="text-xs text-green-600">
                Order #{executeMutation.data.id} 제출됨 — 워커가 처리 중. 결과는 활동 로그에서 확인.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

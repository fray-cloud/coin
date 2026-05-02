'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExchangeKeys } from '@/hooks/use-exchange-keys';
import { useBalances } from '@/hooks/use-balances';
import { requestSignal, executeTrade, type SignalResponse } from '@/lib/api-client';

const TOP_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'] as const;
const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
const LEVERAGE_MARKS = [1, 25, 50, 75, 100, 125] as const;
const QUICK_FILL_PCTS = [10, 25, 50, 100] as const;

type Network = 'testnet' | 'mainnet';

interface SignalState {
  response: SignalResponse;
  tpOverride: string;
  slOverride: string;
}

function pctDiff(price: string | number, entry: string | number): number | null {
  const p = Number(price);
  const e = Number(entry);
  if (!Number.isFinite(p) || !Number.isFinite(e) || e === 0) return null;
  return ((p - e) / e) * 100;
}

function formatPct(p: number | null): string {
  if (p == null) return '-';
  const sign = p > 0 ? '+' : '';
  return `${sign}${p.toFixed(2)}%`;
}

export function LlmTradeForm() {
  const [symbol, setSymbol] = useState<(typeof TOP_SYMBOLS)[number]>('BTCUSDT');
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>('5m');
  const [candleCount, setCandleCount] = useState(50);
  const [network, setNetwork] = useState<Network>('testnet');
  const [betUsdt, setBetUsdt] = useState(50);
  const [leverage, setLeverage] = useState(5);
  const [signal, setSignal] = useState<SignalState | null>(null);
  const [error, setError] = useState('');

  const { data: keys = [] } = useExchangeKeys();
  const selectedKey = useMemo(
    () => keys.find((k) => k.exchange === 'binance' && k.network === network),
    [keys, network],
  );
  const { data: balances = [] } = useBalances(selectedKey?.id);
  const usdtBalance = useMemo(() => {
    const usdt = balances.find((b) => b.currency === 'USDT');
    return usdt ? Number(usdt.free) + Number(usdt.locked) : 0;
  }, [balances]);
  const usdtFree = useMemo(() => {
    const usdt = balances.find((b) => b.currency === 'USDT');
    return usdt ? Number(usdt.free) : 0;
  }, [balances]);

  // Clamp bet to free balance whenever balance changes (and bet was over).
  useEffect(() => {
    if (usdtFree > 0 && betUsdt > usdtFree) setBetUsdt(Math.floor(usdtFree));
  }, [usdtFree, betUsdt]);

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
      exchangeKeyId: selectedKey?.id,
    });
  };

  const tpPct = signal ? pctDiff(signal.tpOverride, signal.response.entryPrice) : null;
  const slPct = signal ? pctDiff(signal.slOverride, signal.response.entryPrice) : null;

  // Position-side aware: for SHORT, TP is below entry (negative %) and that's
  // a profit — display absolute value with explicit profit/loss labels.
  const tpProfitPct = signal
    ? signal.response.signal === 'long'
      ? tpPct
      : tpPct == null
        ? null
        : -tpPct
    : null;
  const slLossPct = signal
    ? signal.response.signal === 'long'
      ? slPct
      : slPct == null
        ? null
        : -slPct
    : null;

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
            <div className="col-span-2">
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
          </div>

          {/* Network toggle */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">네트워크</label>
            <div className="flex gap-2">
              {(['testnet', 'mainnet'] as Network[]).map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={network === n ? 'default' : 'outline'}
                  onClick={() => setNetwork(n)}
                  className={
                    network === n
                      ? n === 'testnet'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-orange-600 hover:bg-orange-700'
                      : ''
                  }
                >
                  {n === 'testnet' ? '모의 (Testnet)' : '실거래 (Mainnet)'}
                </Button>
              ))}
            </div>
            {!selectedKey && (
              <p className="text-xs text-orange-500 mt-1.5">
                {network === 'testnet' ? '테스트넷' : '메인넷'} API 키가 설정에 등록되지 않았습니다.
              </p>
            )}
          </div>

          {/* Leverage slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-muted-foreground">레버리지</label>
              <span className="text-sm font-mono font-semibold">{leverage}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={125}
              step={1}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              {LEVERAGE_MARKS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLeverage(m)}
                  className={`tabular-nums hover:text-foreground ${leverage === m ? 'text-foreground font-semibold' : ''}`}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>

          {/* Bet amount with balance-aware quick-fill */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-muted-foreground">베팅비용 (USDT, 증거금)</label>
              <Badge variant={network === 'testnet' ? 'purple' : 'orange'}>
                {selectedKey
                  ? `잔고 ${usdtFree.toFixed(2)} / ${usdtBalance.toFixed(2)} USDT`
                  : '키 미등록'}
              </Badge>
            </div>
            <input
              type="number"
              min={1}
              max={Math.max(1, Math.floor(usdtFree))}
              value={betUsdt}
              onChange={(e) => setBetUsdt(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-1 mt-1.5">
              {QUICK_FILL_PCTS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  disabled={usdtFree <= 0}
                  onClick={() => setBetUsdt(Math.max(1, Math.floor((usdtFree * pct) / 100)))}
                  className="flex-1 h-7 text-[11px] rounded border border-input hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pct}%
                </button>
              ))}
            </div>
            {betUsdt > usdtFree && usdtFree > 0 && (
              <p className="text-[11px] text-red-500 mt-1">잔고를 초과합니다.</p>
            )}
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
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">
                  진입가 (lastClose)
                </label>
                <input
                  readOnly
                  value={signal.response.entryPrice}
                  className="w-full h-9 px-3 rounded-md border border-input bg-muted/50 text-sm font-mono"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">TP (override 가능)</label>
                  <span
                    className={`text-[11px] tabular-nums font-semibold ${tpProfitPct != null && tpProfitPct >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    title="진입가 대비 가격 차이 (long 기준 양수=익절)"
                  >
                    {formatPct(tpPct)}
                    {tpProfitPct != null && (
                      <span className="ml-1 text-muted-foreground font-normal">
                        ({tpProfitPct >= 0 ? '+' : ''}
                        {tpProfitPct.toFixed(2)}% 손익 · {(tpProfitPct * leverage).toFixed(2)}% ROE)
                      </span>
                    )}
                  </span>
                </div>
                <input
                  type="text"
                  value={signal.tpOverride}
                  onChange={(e) => setSignal({ ...signal, tpOverride: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">SL (override 가능)</label>
                  <span
                    className={`text-[11px] tabular-nums font-semibold ${slLossPct != null && slLossPct < 0 ? 'text-red-500' : 'text-green-500'}`}
                    title="진입가 대비 가격 차이 (long 기준 음수=손절)"
                  >
                    {formatPct(slPct)}
                    {slLossPct != null && (
                      <span className="ml-1 text-muted-foreground font-normal">
                        ({slLossPct >= 0 ? '+' : ''}
                        {slLossPct.toFixed(2)}% 손익 · {(slLossPct * leverage).toFixed(2)}% ROE)
                      </span>
                    )}
                  </span>
                </div>
                <input
                  type="text"
                  value={signal.slOverride}
                  onChange={(e) => setSignal({ ...signal, slOverride: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <Button
              onClick={handleExecute}
              disabled={executeMutation.isPending || !selectedKey || betUsdt > usdtFree}
              className="w-full"
            >
              {executeMutation.isPending
                ? '거래 실행 중...'
                : `거래 실행 (${signal.response.signal.toUpperCase()} ${leverage}x · ${network === 'testnet' ? '모의' : '실거래'})`}
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

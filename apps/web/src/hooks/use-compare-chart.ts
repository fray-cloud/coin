'use client';

import { useQueries } from '@tanstack/react-query';
import { getCandles, type CandleData } from '@/lib/api-client';
import { useExchangeRate } from '@/hooks/use-exchange-rate';

type PriceType = 'high' | 'low' | 'mid' | 'close';

const COIN_SYMBOL_MAP: Record<string, Record<string, string>> = {
  BTC: { upbit: 'KRW-BTC', binance: 'BTCUSDT', bybit: 'BTCUSDT' },
  ETH: { upbit: 'KRW-ETH', binance: 'ETHUSDT', bybit: 'ETHUSDT' },
  XRP: { upbit: 'KRW-XRP', binance: 'XRPUSDT', bybit: 'XRPUSDT' },
};

function extractPrice(candle: CandleData, priceType: PriceType): number {
  switch (priceType) {
    case 'high':
      return Number(candle.high);
    case 'low':
      return Number(candle.low);
    case 'mid':
      return (Number(candle.high) + Number(candle.low)) / 2;
    case 'close':
      return Number(candle.close);
  }
}

interface CompareLineData {
  exchange: string;
  data: Array<{ time: number; value: number }>;
}

export function useCompareChart(
  baseCoin: string,
  interval: string,
  priceType: PriceType,
  currentExchange: string,
  enabled: boolean,
) {
  const symbols = COIN_SYMBOL_MAP[baseCoin.toUpperCase()] || {};
  const exchanges = Object.keys(symbols);
  const { krwPerUsd } = useExchangeRate();

  const candleQueries = useQueries({
    queries: exchanges.map((ex) => ({
      queryKey: ['candles', ex, symbols[ex], interval],
      queryFn: () => getCandles(ex, symbols[ex], interval),
      staleTime: 60_000,
      enabled: enabled && !!symbols[ex],
    })),
  });

  const isLoading = candleQueries.some((q) => q.isLoading);
  const currentIsKrw = currentExchange === 'upbit';

  const lines: CompareLineData[] = exchanges.map((ex, i) => {
    const candles = candleQueries[i]?.data || [];
    const compareIsKrw = ex === 'upbit';

    return {
      exchange: ex,
      data: candles.map((c) => {
        let price = extractPrice(c, priceType);

        if (krwPerUsd > 0 && currentIsKrw !== compareIsKrw) {
          if (currentIsKrw && !compareIsKrw) {
            price = price * krwPerUsd;
          } else if (!currentIsKrw && compareIsKrw) {
            price = price / krwPerUsd;
          }
        }

        return { time: c.timestamp / 1000, value: price };
      }),
    };
  });

  return { lines, isLoading, exchanges };
}

export function parseCoinFromSymbol(symbol: string): string {
  if (symbol.includes('-')) return symbol.split('-').pop()!;
  for (const quote of ['USDT', 'BUSD', 'USD', 'USDC']) {
    if (symbol.endsWith(quote)) return symbol.slice(0, -quote.length);
  }
  return symbol;
}

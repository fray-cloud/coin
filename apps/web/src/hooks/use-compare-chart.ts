'use client';

import { useQueries } from '@tanstack/react-query';
import { getCandles, getExchangeRate, type CandleData } from '@/lib/api-client';

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
  targetCurrency: 'KRW' | 'USD',
  enabled: boolean,
) {
  const symbols = COIN_SYMBOL_MAP[baseCoin.toUpperCase()] || {};
  const exchanges = Object.keys(symbols);

  const candleQueries = useQueries({
    queries: exchanges.map((ex) => ({
      queryKey: ['candles', ex, symbols[ex], interval],
      queryFn: () => getCandles(ex, symbols[ex], interval),
      staleTime: 60_000,
      enabled: enabled && !!symbols[ex],
    })),
  });

  const rateQuery = useQueries({
    queries: [
      {
        queryKey: ['exchangeRate'],
        queryFn: getExchangeRate,
        staleTime: 5 * 60 * 1000,
        enabled,
      },
    ],
  });

  const krwPerUsd = rateQuery[0]?.data?.krwPerUsd || 0;
  const isLoading = candleQueries.some((q) => q.isLoading) || rateQuery[0]?.isLoading;

  const lines: CompareLineData[] = exchanges.map((ex, i) => {
    const candles = candleQueries[i]?.data || [];
    const isKrwExchange = ex === 'upbit';

    return {
      exchange: ex,
      data: candles.map((c) => {
        let price = extractPrice(c, priceType);

        // Convert to target currency
        if (krwPerUsd > 0) {
          if (targetCurrency === 'USD' && isKrwExchange) {
            price = price / krwPerUsd;
          } else if (targetCurrency === 'KRW' && !isKrwExchange) {
            price = price * krwPerUsd;
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

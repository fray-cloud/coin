'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CoinIcon, ExchangeIcon } from '@/components/icons';
import { CandleChart } from '@/components/candle-chart';
import { useTickers } from '@/hooks/use-tickers';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { formatPrice } from '@/lib/utils';

export default function MarketDetailPage() {
  const params = useParams();
  const exchange = params.exchange as string;
  const symbol = decodeURIComponent(params.symbol as string);
  const t = useTranslations('ticker');
  const { tickers } = useTickers();
  const { krwPerUsd } = useExchangeRate();

  const ticker = tickers.find((t) => t.exchange === exchange && t.symbol === symbol);
  const changeNum = ticker ? Number(ticker.changePercent24h) : 0;
  const changeColor =
    changeNum > 0 ? 'text-green-500' : changeNum < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <Link
        href="/markets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        {t('exchange')}
      </Link>

      <div className="flex items-center gap-3">
        <ExchangeIcon exchange={exchange} size={28} />
        <CoinIcon symbol={symbol} size={28} />
        <div>
          <h1 className="text-2xl font-bold">
            {exchange.charAt(0).toUpperCase() + exchange.slice(1)} — {symbol}
          </h1>
          {ticker && (
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-xl font-bold tabular-nums">{formatPrice(ticker.price)}</span>
              <span className={`text-sm font-medium ${changeColor}`}>
                {changeNum > 0 ? '+' : ''}
                {changeNum.toFixed(2)}%
              </span>
              {krwPerUsd > 0 && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {exchange === 'upbit'
                    ? `$${(Number(ticker.price) / krwPerUsd).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                    : `₩${(Number(ticker.price) * krwPerUsd).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {ticker && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{t('high24h')}</p>
              <p className="font-bold tabular-nums">{formatPrice(ticker.high24h)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{t('low24h')}</p>
              <p className="font-bold tabular-nums">{formatPrice(ticker.low24h)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{t('volume')}</p>
              <p className="font-bold tabular-nums">
                {Number(ticker.volume24h) >= 1_000_000
                  ? `${(Number(ticker.volume24h) / 1_000_000).toFixed(2)}M`
                  : Number(ticker.volume24h).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{t('change24h')}</p>
              <p className={`font-bold ${changeColor}`}>
                {changeNum > 0 ? '+' : ''}
                {changeNum.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <CandleChart exchange={exchange} symbol={symbol} height={500} />
        </CardContent>
      </Card>
    </div>
  );
}

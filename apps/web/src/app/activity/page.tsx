'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ShoppingCart, BrainCircuit, Shield, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import { getActivity, type ActivityItem } from '@/lib/api-client';
import { STATUS_STYLES } from '@/lib/constants';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

function ActivityIcon({ type, side }: { type: ActivityItem['type']; side?: string }) {
  switch (type) {
    case 'order':
      return (
        <div
          className={`p-2 rounded-full ${side === 'buy' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
        >
          <ShoppingCart
            size={16}
            className={
              side === 'buy'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }
          />
        </div>
      );
    case 'strategy_signal':
      return (
        <div
          className={`p-2 rounded-full ${side === 'buy' ? 'bg-blue-100 dark:bg-blue-900/30' : side === 'sell' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}
        >
          <BrainCircuit
            size={16}
            className={
              side === 'buy'
                ? 'text-blue-600 dark:text-blue-400'
                : side === 'sell'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-blue-600 dark:text-blue-400'
            }
          />
        </div>
      );
    case 'strategy_order':
      return (
        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
          <BrainCircuit size={16} className="text-green-600 dark:text-green-400" />
        </div>
      );
    case 'risk_blocked':
      return (
        <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <Shield size={16} className="text-yellow-600 dark:text-yellow-400" />
        </div>
      );
    case 'login':
      return (
        <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
          <LogIn size={16} className="text-gray-600 dark:text-gray-400" />
        </div>
      );
  }
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const content = (
    <div className="flex items-start gap-3 py-3 px-4 hover:bg-muted/50 transition-colors">
      <ActivityIcon type={item.type} side={item.side} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{item.title}</span>
          {item.status && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-600'}`}
            >
              {item.status}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {item.exchange && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ExchangeIcon exchange={item.exchange} size={12} />
              {item.exchange}
            </span>
          )}
          {item.symbol && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CoinIcon symbol={item.symbol} size={12} />
              {item.symbol}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {timeAgo(item.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );

  if (item.link && item.link !== '/activity') {
    return <Link href={item.link}>{content}</Link>;
  }
  return content;
}

export default function ActivityPage() {
  const t = useTranslations('nav');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['activity'],
    queryFn: ({ pageParam }) => getActivity(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">{t('activity')}</h1>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="text-center text-muted-foreground py-8">로딩 중...</p>}

          {!isLoading && items.length === 0 && (
            <p className="text-center text-muted-foreground py-8">아직 활동 기록이 없습니다.</p>
          )}

          <div className="divide-y">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>

          {hasNextPage && (
            <div className="py-4 text-center border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? '로딩 중...' : '더 보기'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

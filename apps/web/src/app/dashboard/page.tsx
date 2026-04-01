'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, BrainCircuit, PieChart, ShoppingCart, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useStrategies } from '@/hooks/use-strategies';
import { usePortfolio } from '@/hooks/use-portfolio';
import { useOrders } from '@/hooks/use-orders';
import { useTickers } from '@/hooks/use-tickers';
import { formatKrw } from '@/lib/utils';

const DEFAULT_WIDGET_ORDER = ['portfolio', 'strategies', 'orders', 'markets'] as const;
type WidgetId = (typeof DEFAULT_WIDGET_ORDER)[number];

const STORAGE_KEY = 'dashboard-widget-order';

function loadWidgetOrder(): WidgetId[] {
  if (typeof window === 'undefined') return [...DEFAULT_WIDGET_ORDER];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      const valid = parsed.filter((id): id is WidgetId =>
        (DEFAULT_WIDGET_ORDER as readonly string[]).includes(id),
      );
      if (valid.length === DEFAULT_WIDGET_ORDER.length) return valid;
    }
  } catch {
    // ignore
  }
  return [...DEFAULT_WIDGET_ORDER];
}

function saveWidgetOrder(order: WidgetId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // ignore
  }
}

function PortfolioWidget() {
  const { data } = usePortfolio('all');
  const totalPnl = data ? data.realizedPnl + data.unrealizedPnl : null;
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <PieChart size={14} />
            포트폴리오
          </span>
          <Link href="/portfolio" className="text-xs text-muted-foreground hover:text-foreground">
            자세히 →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data ? (
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">총 평가금액</p>
              <p className="text-lg font-bold tabular-nums">{formatKrw(data.totalValueKrw)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">총 손익</p>
              <p
                className={`text-sm font-medium tabular-nums ${totalPnl !== null && totalPnl >= 0 ? 'text-blue-600' : 'text-red-600'}`}
              >
                {totalPnl !== null ? formatKrw(totalPnl) : '-'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">데이터 없음</p>
        )}
      </CardContent>
    </Card>
  );
}

function StrategiesWidget() {
  const { data: strategies = [] } = useStrategies();
  const active = strategies.filter((s) => s.enabled);
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BrainCircuit size={14} />
            전략
          </span>
          <Link href="/strategies" className="text-xs text-muted-foreground hover:text-foreground">
            자세히 →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-muted-foreground">전체</p>
              <p className="text-lg font-bold">{strategies.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">실행 중</p>
              <p className="text-lg font-bold text-green-600">{active.length}</p>
            </div>
          </div>
          {active.slice(0, 3).map((s) => (
            <div key={s.id} className="text-xs text-muted-foreground truncate">
              • {s.name} ({s.symbol})
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersWidget() {
  const { data } = useOrders();
  const orders = data?.pages[0]?.items?.slice(0, 5) ?? [];
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShoppingCart size={14} />
            최근 주문
          </span>
          <Link href="/orders" className="text-xs text-muted-foreground hover:text-foreground">
            자세히 →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">주문 없음</p>
        ) : (
          <div className="space-y-1.5">
            {orders.map((o) => (
              <div key={o.id} className="flex justify-between text-xs">
                <span className={o.side === 'buy' ? 'text-blue-600' : 'text-red-600'}>
                  {o.side === 'buy' ? '매수' : '매도'} {o.symbol}
                </span>
                <span className="text-muted-foreground">{o.status}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MarketsWidget() {
  const { tickers } = useTickers();
  const top = tickers.slice(0, 5);
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BarChart3 size={14} />
            시장
          </span>
          <Link href="/markets" className="text-xs text-muted-foreground hover:text-foreground">
            자세히 →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">데이터 없음</p>
        ) : (
          <div className="space-y-1.5">
            {top.map((t) => {
              const pct = parseFloat(t.changePercent24h);
              return (
                <div key={`${t.exchange}-${t.symbol}`} className="flex justify-between text-xs">
                  <span className="font-medium">{t.symbol}</span>
                  <span className={pct >= 0 ? 'text-blue-600' : 'text-red-600'}>
                    {pct >= 0 ? '+' : ''}
                    {pct.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const WIDGET_COMPONENTS: Record<WidgetId, React.ComponentType> = {
  portfolio: PortfolioWidget,
  strategies: StrategiesWidget,
  orders: OrdersWidget,
  markets: MarketsWidget,
};

function SortableWidget({ id }: { id: WidgetId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const WidgetComponent = WIDGET_COMPONENTS[id];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        type="button"
        className="absolute top-3 right-3 z-10 p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <WidgetComponent />
    </div>
  );
}

export default function DashboardPage() {
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(() => loadWidgetOrder());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = widgetOrder.indexOf(active.id as WidgetId);
      const newIndex = widgetOrder.indexOf(over.id as WidgetId);
      const newOrder = arrayMove(widgetOrder, oldIndex, newIndex);
      setWidgetOrder(newOrder);
      saveWidgetOrder(newOrder);
    },
    [widgetOrder],
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {widgetOrder.map((id) => (
              <SortableWidget key={id} id={id} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

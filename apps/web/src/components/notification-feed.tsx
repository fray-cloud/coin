'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Bell,
  ShoppingCart,
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useNotificationFeedStore,
  type NotificationEventType,
} from '@/stores/use-notification-feed-store';

const EVENT_ICON: Record<NotificationEventType, React.ElementType> = {
  order_filled: ShoppingCart,
  order_submitted: ShoppingCart,
  order_cancelled: ShoppingCart,
  order_failed: AlertTriangle,
  strategy_signal: BrainCircuit,
  position_opened: TrendingUp,
  position_closed: TrendingDown,
  info: Info,
};

const EVENT_COLOR: Record<NotificationEventType, string> = {
  order_filled: 'text-green-500',
  order_submitted: 'text-blue-500',
  order_cancelled: 'text-muted-foreground',
  order_failed: 'text-red-500',
  strategy_signal: 'text-purple-500',
  position_opened: 'text-green-500',
  position_closed: 'text-orange-500',
  info: 'text-blue-500',
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificationFeed() {
  const t = useTranslations('notificationFeed');
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const notifications = useNotificationFeedStore((s) => s.notifications);
  const markAllRead = useNotificationFeedStore((s) => s.markAllRead);
  const clearAll = useNotificationFeedStore((s) => s.clearAll);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) markAllRead();
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={handleOpen}
        aria-label={t('label')}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 w-80 max-h-[480px] flex flex-col bg-card border rounded-xl shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">{t('title')}</span>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded"
                >
                  {t('clearAll')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Bell size={24} className="opacity-30" />
                <p className="text-sm">{t('empty')}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = EVENT_ICON[n.type] ?? Info;
                const color = EVENT_COLOR[n.type] ?? 'text-blue-500';
                const inner = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors ${
                      !n.isRead ? 'bg-muted/50' : ''
                    }`}
                  >
                    <Icon size={16} className={`mt-0.5 shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                );

                return n.href ? (
                  <Link key={n.id} href={n.href} onClick={() => setOpen(false)} className="block">
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

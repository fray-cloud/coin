import { create } from 'zustand';

export type NotificationEventType =
  | 'order_filled'
  | 'order_submitted'
  | 'order_cancelled'
  | 'order_failed'
  | 'strategy_signal'
  | 'position_opened'
  | 'position_closed'
  | 'info';

export interface FeedNotification {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  href?: string;
  isRead: boolean;
  createdAt: number;
}

interface NotificationFeedState {
  notifications: FeedNotification[];
  addNotification: (n: Omit<FeedNotification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

let _notifId = 0;
const MAX_NOTIFICATIONS = 50;

export const useNotificationFeedStore = create<NotificationFeedState>((set) => ({
  notifications: [],

  addNotification: (n) => {
    const id = String(++_notifId);
    set((state) => ({
      notifications: [
        { ...n, id, isRead: false, createdAt: Date.now() },
        ...state.notifications,
      ].slice(0, MAX_NOTIFICATIONS),
    }));
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));

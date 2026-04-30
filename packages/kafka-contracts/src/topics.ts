export const KAFKA_TOPICS = {
  MARKET_TICKER_UPDATED: 'market.ticker.updated',
  TRADING_ORDER_REQUESTED: 'trading.order.requested',
  TRADING_ORDER_RESULT: 'trading.order.result',
  TRADING_POSITION_UPDATED: 'trading.position.updated',
  NOTIFICATION_SEND: 'notification.send',
  USER_EXCHANGE_KEYS_UPDATED: 'user.exchange-keys.updated',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

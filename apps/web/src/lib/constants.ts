export const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  placed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  filled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const TYPE_COLORS: Record<string, string> = {
  rsi: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  macd: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  bollinger: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export const SIGNAL_STYLES: Record<string, string> = {
  buy: 'text-green-600 dark:text-green-400 font-medium',
  sell: 'text-red-600 dark:text-red-400 font-medium',
};

export const ACTION_STYLES: Record<string, string> = {
  signal_generated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  order_placed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  risk_blocked: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export const STRATEGY_TYPES = [
  { value: 'rsi', label: 'RSI' },
  { value: 'macd', label: 'MACD' },
  { value: 'bollinger', label: 'Bollinger Bands' },
];

export const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  rsi: { period: 14, overbought: 70, oversold: 30, quantity: '0.001' },
  macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, quantity: '0.001' },
  bollinger: { period: 20, stdDev: 2, quantity: '0.001' },
};

export const PARAM_TOOLTIPS: Record<string, string> = {
  period: 'RSI/볼린저 계산에 사용할 캔들 수. 클수록 변동이 완만해짐',
  overbought: 'RSI가 이 값 이상이면 과매수 구간. 매도 시그널 기준',
  oversold: 'RSI가 이 값 이하이면 과매도 구간. 매수 시그널 기준',
  fastPeriod: 'MACD 빠른 EMA 기간. 단기 추세를 반영',
  slowPeriod: 'MACD 느린 EMA 기간. 장기 추세를 반영',
  signalPeriod: 'MACD 시그널 라인 EMA 기간. 매매 타이밍 판단용',
  stdDev: '볼린저 밴드 폭을 결정하는 표준편차 배수. 클수록 밴드가 넓어짐',
  quantity: '한 번 주문 시 거래할 수량',
  stopLossPercent: '손실이 이 비율에 도달하면 자동 손절',
  dailyMaxLossUsd: '하루 최대 허용 손실 금액 (USD)',
  maxPositionSize: '최대 보유 가능한 포지션 크기',
};

export const EXCHANGES = [
  { value: 'upbit', label: 'Upbit' },
  { value: 'binance', label: 'Binance' },
  { value: 'bybit', label: 'Bybit' },
];

export type Tendency = 'safe' | 'balanced' | 'aggressive';
export type Goal = 'longterm' | 'shortterm' | 'volatility';

interface StrategyPreset {
  type: string;
  config: Record<string, unknown>;
  riskConfig: Record<string, unknown>;
  candleInterval: string;
  intervalSeconds: number;
  description: string;
}

const PRESETS: Record<`${Tendency}_${Goal}`, StrategyPreset> = {
  safe_longterm: {
    type: 'rsi',
    config: { period: 21, overbought: 80, oversold: 20, quantity: '0.001' },
    riskConfig: { stopLossPercent: 3, dailyMaxLossUsd: 50, maxPositionSize: '0.01' },
    candleInterval: '4h',
    intervalSeconds: 300,
    description: '장기 안전 투자. RSI 보수적 설정으로 확실한 과매도/과매수만 포착',
  },
  safe_shortterm: {
    type: 'rsi',
    config: { period: 14, overbought: 75, oversold: 25, quantity: '0.001' },
    riskConfig: { stopLossPercent: 2, dailyMaxLossUsd: 30, maxPositionSize: '0.005' },
    candleInterval: '1h',
    intervalSeconds: 120,
    description: '단기 안전 투자. 보수적 RSI로 작은 수익 반복',
  },
  safe_volatility: {
    type: 'bollinger',
    config: { period: 20, stdDev: 2.5, quantity: '0.001' },
    riskConfig: { stopLossPercent: 3, dailyMaxLossUsd: 50, maxPositionSize: '0.01' },
    candleInterval: '1h',
    intervalSeconds: 180,
    description: '안전 변동성 활용. 넓은 볼린저 밴드로 극단적 움직임만 포착',
  },
  balanced_longterm: {
    type: 'macd',
    config: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, quantity: '0.005' },
    riskConfig: { stopLossPercent: 5, dailyMaxLossUsd: 100 },
    candleInterval: '4h',
    intervalSeconds: 300,
    description: '균형 장기 투자. MACD 크로스오버로 추세 전환 포착',
  },
  balanced_shortterm: {
    type: 'macd',
    config: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, quantity: '0.005' },
    riskConfig: { stopLossPercent: 5, dailyMaxLossUsd: 100 },
    candleInterval: '1h',
    intervalSeconds: 120,
    description: '균형 단기 투자. 1시간봉 MACD로 적당한 타이밍 매매',
  },
  balanced_volatility: {
    type: 'bollinger',
    config: { period: 20, stdDev: 2, quantity: '0.005' },
    riskConfig: { stopLossPercent: 5, dailyMaxLossUsd: 100 },
    candleInterval: '15m',
    intervalSeconds: 60,
    description: '균형 변동성 활용. 표준 볼린저 밴드로 반등/하락 매매',
  },
  aggressive_longterm: {
    type: 'rsi',
    config: { period: 10, overbought: 65, oversold: 35, quantity: '0.01' },
    riskConfig: { stopLossPercent: 10 },
    candleInterval: '1h',
    intervalSeconds: 60,
    description: '공격적 장기. 민감한 RSI로 빈번한 매매, 큰 포지션',
  },
  aggressive_shortterm: {
    type: 'macd',
    config: { fastPeriod: 8, slowPeriod: 17, signalPeriod: 9, quantity: '0.01' },
    riskConfig: { stopLossPercent: 8 },
    candleInterval: '5m',
    intervalSeconds: 30,
    description: '공격적 단기. 빠른 MACD로 5분봉 스캘핑',
  },
  aggressive_volatility: {
    type: 'bollinger',
    config: { period: 15, stdDev: 1.5, quantity: '0.01' },
    riskConfig: {},
    candleInterval: '5m',
    intervalSeconds: 30,
    description: '공격적 변동성. 좁은 밴드로 잦은 매매, 손절 없음',
  },
};

export function getPreset(tendency: Tendency, goal: Goal): StrategyPreset {
  return PRESETS[`${tendency}_${goal}`];
}

export const TENDENCIES: Array<{ value: Tendency; label: string; emoji: string; desc: string }> = [
  { value: 'safe', label: '안전형', emoji: '🛡️', desc: '작은 수익, 낮은 리스크' },
  { value: 'balanced', label: '균형형', emoji: '⚖️', desc: '적당한 수익과 리스크' },
  { value: 'aggressive', label: '공격형', emoji: '🔥', desc: '큰 수익, 높은 리스크' },
];

export const GOALS: Array<{ value: Goal; label: string; emoji: string; desc: string }> = [
  { value: 'longterm', label: '장기 저축', emoji: '🏦', desc: '꾸준한 장기 자산 증식' },
  { value: 'shortterm', label: '단기 수익', emoji: '⚡', desc: '빠른 수익 실현' },
  { value: 'volatility', label: '변동성 활용', emoji: '📊', desc: '가격 변동에서 기회 포착' },
];

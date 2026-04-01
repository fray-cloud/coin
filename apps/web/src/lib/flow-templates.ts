import type { FlowDefinition } from '@coin/types';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  recommendedPairs: string[];
  recommendedTimeframes: string[];
  definition: FlowDefinition;
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'template-macd-golden-cross',
    name: 'MACD 골든크로스 전략',
    description:
      'MACD 선이 시그널 선을 위로 돌파할 때 매수, 아래로 돌파할 때 매도하는 추세 추종 전략',
    difficulty: 'beginner',
    tags: ['추세추종', 'MACD', '골든크로스'],
    recommendedPairs: ['BTC/USDT', 'ETH/USDT'],
    recommendedTimeframes: ['1h', '4h'],
    definition: {
      nodes: [
        {
          id: 'n1',
          type: 'data',
          subtype: 'candle-stream',
          position: { x: 50, y: 220 },
          config: { interval: '1h' },
        },
        {
          id: 'n2',
          type: 'indicator',
          subtype: 'macd',
          position: { x: 280, y: 220 },
          config: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        },
        {
          id: 'n3',
          type: 'condition',
          subtype: 'crossover',
          position: { x: 540, y: 100 },
          config: { direction: 'above' },
        },
        {
          id: 'n4',
          type: 'condition',
          subtype: 'crossover',
          position: { x: 540, y: 340 },
          config: { direction: 'below' },
        },
        {
          id: 'n5',
          type: 'order',
          subtype: 'market-order',
          position: { x: 800, y: 100 },
          config: { side: 'buy', amount: '10%' },
        },
        {
          id: 'n6',
          type: 'order',
          subtype: 'market-order',
          position: { x: 800, y: 340 },
          config: { side: 'sell', amount: '100%' },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'candles', targetHandle: 'candles' },
        { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'macd', targetHandle: 'value_a' },
        { id: 'e3', source: 'n2', target: 'n3', sourceHandle: 'signal', targetHandle: 'value_b' },
        { id: 'e4', source: 'n2', target: 'n4', sourceHandle: 'macd', targetHandle: 'value_a' },
        { id: 'e5', source: 'n2', target: 'n4', sourceHandle: 'signal', targetHandle: 'value_b' },
        { id: 'e6', source: 'n3', target: 'n5', sourceHandle: 'result', targetHandle: 'trigger' },
        { id: 'e7', source: 'n4', target: 'n6', sourceHandle: 'result', targetHandle: 'trigger' },
      ],
    },
  },
  {
    id: 'template-rsi-mean-reversion',
    name: 'RSI 과매수/과매도 전략',
    description: 'RSI 30 이하에서 매수, 70 이상에서 매도하는 평균 회귀 전략',
    difficulty: 'beginner',
    tags: ['평균회귀', 'RSI', '과매수', '과매도'],
    recommendedPairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
    recommendedTimeframes: ['4h', '1d'],
    definition: {
      nodes: [
        {
          id: 'n1',
          type: 'data',
          subtype: 'candle-stream',
          position: { x: 50, y: 220 },
          config: { interval: '4h' },
        },
        {
          id: 'n2',
          type: 'indicator',
          subtype: 'rsi',
          position: { x: 280, y: 220 },
          config: { period: 14, source: 'close' },
        },
        {
          id: 'n3',
          type: 'condition',
          subtype: 'threshold',
          position: { x: 540, y: 100 },
          config: { operator: '<', threshold: 30 },
        },
        {
          id: 'n4',
          type: 'condition',
          subtype: 'threshold',
          position: { x: 540, y: 340 },
          config: { operator: '>', threshold: 70 },
        },
        {
          id: 'n5',
          type: 'order',
          subtype: 'market-order',
          position: { x: 800, y: 100 },
          config: { side: 'buy', amount: '10%' },
        },
        {
          id: 'n6',
          type: 'order',
          subtype: 'market-order',
          position: { x: 800, y: 340 },
          config: { side: 'sell', amount: '100%' },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'candles', targetHandle: 'candles' },
        { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'value', targetHandle: 'value' },
        { id: 'e3', source: 'n2', target: 'n4', sourceHandle: 'value', targetHandle: 'value' },
        { id: 'e4', source: 'n3', target: 'n5', sourceHandle: 'result', targetHandle: 'trigger' },
        { id: 'e5', source: 'n4', target: 'n6', sourceHandle: 'result', targetHandle: 'trigger' },
      ],
    },
  },
  {
    id: 'template-ma-golden-cross',
    name: '이동평균선 골든크로스 전략',
    description:
      '단기 EMA(50)가 장기 EMA(200)를 위로 돌파하면 매수, 아래로 돌파하면 매도하는 장기 추세 전략',
    difficulty: 'beginner',
    tags: ['추세추종', '이동평균', '골든크로스', '장기전략'],
    recommendedPairs: ['BTC/USDT', 'ETH/USDT'],
    recommendedTimeframes: ['4h', '1d'],
    definition: {
      nodes: [
        {
          id: 'n1',
          type: 'data',
          subtype: 'candle-stream',
          position: { x: 50, y: 220 },
          config: { interval: '4h' },
        },
        {
          id: 'n2',
          type: 'indicator',
          subtype: 'ema',
          position: { x: 280, y: 100 },
          config: { period: 50 },
        },
        {
          id: 'n3',
          type: 'indicator',
          subtype: 'ema',
          position: { x: 280, y: 340 },
          config: { period: 200 },
        },
        {
          id: 'n4',
          type: 'condition',
          subtype: 'crossover',
          position: { x: 540, y: 100 },
          config: { direction: 'above' },
        },
        {
          id: 'n5',
          type: 'condition',
          subtype: 'crossover',
          position: { x: 540, y: 340 },
          config: { direction: 'below' },
        },
        {
          id: 'n6',
          type: 'order',
          subtype: 'market-order',
          position: { x: 800, y: 100 },
          config: { side: 'buy', amount: '20%' },
        },
        {
          id: 'n7',
          type: 'order',
          subtype: 'market-order',
          position: { x: 800, y: 340 },
          config: { side: 'sell', amount: '100%' },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'candles', targetHandle: 'candles' },
        { id: 'e2', source: 'n1', target: 'n3', sourceHandle: 'candles', targetHandle: 'candles' },
        { id: 'e3', source: 'n2', target: 'n4', sourceHandle: 'value', targetHandle: 'value_a' },
        { id: 'e4', source: 'n3', target: 'n4', sourceHandle: 'value', targetHandle: 'value_b' },
        { id: 'e5', source: 'n2', target: 'n5', sourceHandle: 'value', targetHandle: 'value_a' },
        { id: 'e6', source: 'n3', target: 'n5', sourceHandle: 'value', targetHandle: 'value_b' },
        { id: 'e7', source: 'n4', target: 'n6', sourceHandle: 'result', targetHandle: 'trigger' },
        { id: 'e8', source: 'n5', target: 'n7', sourceHandle: 'result', targetHandle: 'trigger' },
      ],
    },
  },
  {
    id: 'template-rsi-macd-combo',
    name: 'RSI + MACD 복합 전략',
    description:
      'RSI 과매도(30 이하)에서 MACD 골든크로스 발생 시 매수, RSI 과매수(70 이상)에서 매도하는 복합 신호 전략',
    difficulty: 'intermediate',
    tags: ['복합전략', 'RSI', 'MACD', '추세추종', '중급'],
    recommendedPairs: ['BTC/USDT', 'ETH/USDT'],
    recommendedTimeframes: ['4h'],
    definition: {
      nodes: [
        {
          id: 'n1',
          type: 'data',
          subtype: 'candle-stream',
          position: { x: 50, y: 300 },
          config: { interval: '4h' },
        },
        {
          id: 'n2',
          type: 'indicator',
          subtype: 'rsi',
          position: { x: 280, y: 100 },
          config: { period: 14, source: 'close' },
        },
        {
          id: 'n3',
          type: 'indicator',
          subtype: 'macd',
          position: { x: 280, y: 420 },
          config: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        },
        {
          id: 'n4',
          type: 'condition',
          subtype: 'threshold',
          position: { x: 540, y: 100 },
          config: { operator: '<', threshold: 30 },
        },
        {
          id: 'n5',
          type: 'condition',
          subtype: 'crossover',
          position: { x: 540, y: 420 },
          config: { direction: 'above' },
        },
        {
          id: 'n6',
          type: 'condition',
          subtype: 'and-or',
          position: { x: 760, y: 240 },
          config: { operator: 'AND' },
        },
        {
          id: 'n7',
          type: 'condition',
          subtype: 'threshold',
          position: { x: 540, y: 620 },
          config: { operator: '>', threshold: 70 },
        },
        {
          id: 'n8',
          type: 'order',
          subtype: 'market-order',
          position: { x: 980, y: 240 },
          config: { side: 'buy', amount: '15%' },
        },
        {
          id: 'n9',
          type: 'order',
          subtype: 'market-order',
          position: { x: 760, y: 620 },
          config: { side: 'sell', amount: '100%' },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'candles', targetHandle: 'candles' },
        { id: 'e2', source: 'n1', target: 'n3', sourceHandle: 'candles', targetHandle: 'candles' },
        { id: 'e3', source: 'n2', target: 'n4', sourceHandle: 'value', targetHandle: 'value' },
        { id: 'e4', source: 'n3', target: 'n5', sourceHandle: 'macd', targetHandle: 'value_a' },
        { id: 'e5', source: 'n3', target: 'n5', sourceHandle: 'signal', targetHandle: 'value_b' },
        { id: 'e6', source: 'n4', target: 'n6', sourceHandle: 'result', targetHandle: 'a' },
        { id: 'e7', source: 'n5', target: 'n6', sourceHandle: 'result', targetHandle: 'b' },
        { id: 'e8', source: 'n6', target: 'n8', sourceHandle: 'result', targetHandle: 'trigger' },
        { id: 'e9', source: 'n2', target: 'n7', sourceHandle: 'value', targetHandle: 'value' },
        { id: 'e10', source: 'n7', target: 'n9', sourceHandle: 'result', targetHandle: 'trigger' },
      ],
    },
  },
];

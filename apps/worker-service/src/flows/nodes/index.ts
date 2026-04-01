import type { IFlowNode } from '../flow-node.interface';
import { CandleStreamNode } from './data-candle-stream.node';
import { RsiNode } from './indicator-rsi.node';
import { MacdNode } from './indicator-macd.node';
import { BollingerNode } from './indicator-bollinger.node';
import { EmaNode } from './indicator-ema.node';
import { ThresholdNode } from './condition-threshold.node';
import { CrossoverNode } from './condition-crossover.node';
import { AndOrNode } from './condition-and-or.node';
import { MarketOrderNode } from './order-market.node';
import { AlertNode } from './order-alert.node';

export const NODE_REGISTRY: Record<string, IFlowNode> = {
  'candle-stream': new CandleStreamNode(),
  rsi: new RsiNode(),
  macd: new MacdNode(),
  bollinger: new BollingerNode(),
  ema: new EmaNode(),
  threshold: new ThresholdNode(),
  crossover: new CrossoverNode(),
  'and-or': new AndOrNode(),
  'market-order': new MarketOrderNode(),
  alert: new AlertNode(),
};

export { CandleStreamNode } from './data-candle-stream.node';
export { RsiNode } from './indicator-rsi.node';
export { MacdNode } from './indicator-macd.node';
export { BollingerNode } from './indicator-bollinger.node';
export { EmaNode } from './indicator-ema.node';
export { ThresholdNode } from './condition-threshold.node';
export { CrossoverNode } from './condition-crossover.node';
export { AndOrNode } from './condition-and-or.node';
export { MarketOrderNode } from './order-market.node';
export { AlertNode } from './order-alert.node';

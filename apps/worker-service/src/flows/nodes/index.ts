import type { IFlowNode } from '../flow-node.interface';
import { CandleStreamNode } from './data-candle-stream.node';
import { RsiNode } from './indicator-rsi.node';
import { ThresholdNode } from './condition-threshold.node';
import { MarketOrderNode } from './order-market.node';

export const NODE_REGISTRY: Record<string, IFlowNode> = {
  'candle-stream': new CandleStreamNode(),
  rsi: new RsiNode(),
  threshold: new ThresholdNode(),
  'market-order': new MarketOrderNode(),
};

export { CandleStreamNode } from './data-candle-stream.node';
export { RsiNode } from './indicator-rsi.node';
export { ThresholdNode } from './condition-threshold.node';
export { MarketOrderNode } from './order-market.node';

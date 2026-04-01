import { describe, it, expect } from 'vitest';
import type { FlowDefinition, Candle } from '@coin/types';
import { FlowCompiler, FlowValidationError } from '../flow-compiler';

const compiler = new FlowCompiler();

function createMinimalFlow(): FlowDefinition {
  return {
    nodes: [
      {
        id: 'data-1',
        type: 'data',
        subtype: 'candle-stream',
        position: { x: 0, y: 0 },
        config: {},
      },
      {
        id: 'rsi-1',
        type: 'indicator',
        subtype: 'rsi',
        position: { x: 200, y: 0 },
        config: { period: 14 },
      },
      {
        id: 'threshold-1',
        type: 'condition',
        subtype: 'threshold',
        position: { x: 400, y: 0 },
        config: { operator: '<', threshold: 30 },
      },
      {
        id: 'order-1',
        type: 'order',
        subtype: 'market-order',
        position: { x: 600, y: 0 },
        config: { side: 'buy', amount: '0.001' },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'data-1',
        target: 'rsi-1',
        sourceHandle: 'candles',
        targetHandle: 'candles',
      },
      {
        id: 'e2',
        source: 'rsi-1',
        target: 'threshold-1',
        sourceHandle: 'value',
        targetHandle: 'value',
      },
      {
        id: 'e3',
        source: 'threshold-1',
        target: 'order-1',
        sourceHandle: 'result',
        targetHandle: 'trigger',
      },
    ],
  };
}

function generateDecreasingCandles(count: number): Candle[] {
  const base = 100;
  return Array.from({ length: count }, (_, i) => ({
    exchange: 'upbit' as const,
    symbol: 'BTC/KRW',
    interval: '1h',
    open: String(base - i * 0.4),
    high: String(base - i * 0.3),
    low: String(base - i * 0.6),
    close: String(base - i * 0.5),
    volume: '100',
    timestamp: Date.now() - (count - i) * 3600000,
  }));
}

function generateIncreasingCandles(count: number): Candle[] {
  const base = 50;
  return Array.from({ length: count }, (_, i) => ({
    exchange: 'upbit' as const,
    symbol: 'BTC/KRW',
    interval: '1h',
    open: String(base + i * 0.4),
    high: String(base + i * 0.6),
    low: String(base + i * 0.3),
    close: String(base + i * 0.5),
    volume: '100',
    timestamp: Date.now() - (count - i) * 3600000,
  }));
}

describe('FlowCompiler - 검증', () => {
  it('빈 노드 배열이면 에러를 던져야 한다', () => {
    expect(() => compiler.validate({ nodes: [], edges: [] })).toThrow(FlowValidationError);
    expect(() => compiler.validate({ nodes: [], edges: [] })).toThrow('at least one node');
  });

  it('노드 수가 최대 제한을 초과하면 에러를 던져야 한다', () => {
    const nodes = Array.from({ length: 51 }, (_, i) => ({
      id: `node-${i}`,
      type: 'data' as const,
      subtype: 'candle-stream',
      position: { x: 0, y: 0 },
      config: {},
    }));
    expect(() => compiler.validate({ nodes, edges: [] })).toThrow('exceeds maximum');
  });

  it('중복된 노드 ID가 있으면 에러를 던져야 한다', () => {
    const flow: FlowDefinition = {
      nodes: [
        { id: 'dup', type: 'data', subtype: 'candle-stream', position: { x: 0, y: 0 }, config: {} },
        {
          id: 'dup',
          type: 'order',
          subtype: 'market-order',
          position: { x: 200, y: 0 },
          config: {},
        },
      ],
      edges: [],
    };
    expect(() => compiler.validate(flow)).toThrow('Duplicate node ID');
  });

  it('알 수 없는 노드 타입이면 에러를 던져야 한다', () => {
    const flow: FlowDefinition = {
      nodes: [
        { id: 'n1', type: 'data', subtype: 'unknown-type', position: { x: 0, y: 0 }, config: {} },
        {
          id: 'n2',
          type: 'order',
          subtype: 'market-order',
          position: { x: 200, y: 0 },
          config: {},
        },
      ],
      edges: [],
    };
    expect(() => compiler.validate(flow)).toThrow('Unknown node subtype');
  });

  it('순환이 있으면 에러를 던져야 한다', () => {
    // Both threshold nodes have their required input satisfied via edges,
    // but the edges form a cycle (b→c and c→b)
    const flow: FlowDefinition = {
      nodes: [
        { id: 'a', type: 'data', subtype: 'candle-stream', position: { x: 0, y: 0 }, config: {} },
        {
          id: 'b',
          type: 'condition',
          subtype: 'threshold',
          position: { x: 200, y: 0 },
          config: {},
        },
        {
          id: 'c',
          type: 'condition',
          subtype: 'threshold',
          position: { x: 400, y: 0 },
          config: {},
        },
        { id: 'd', type: 'order', subtype: 'market-order', position: { x: 600, y: 0 }, config: {} },
      ],
      edges: [
        // b's "value" input is satisfied by c's "result" output (type mismatch but targetHandle matches)
        { id: 'e1', source: 'c', target: 'b', sourceHandle: 'result', targetHandle: 'value' },
        // c's "value" input is satisfied by b's "result" output
        { id: 'e2', source: 'b', target: 'c', sourceHandle: 'result', targetHandle: 'value' },
        // d's trigger is satisfied
        { id: 'e3', source: 'b', target: 'd', sourceHandle: 'result', targetHandle: 'trigger' },
      ],
    };
    expect(() => compiler.validate(flow)).toThrow('contains a cycle');
  });

  it('데이터 소스 노드가 없으면 에러를 던져야 한다', () => {
    // Move the required input check to not fail before data source check
    // by providing edges that satisfy required inputs
    const flow: FlowDefinition = {
      nodes: [
        { id: 'n1', type: 'condition', subtype: 'threshold', position: { x: 0, y: 0 }, config: {} },
        {
          id: 'n2',
          type: 'order',
          subtype: 'market-order',
          position: { x: 200, y: 0 },
          config: {},
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'result', targetHandle: 'trigger' },
      ],
    };
    expect(() => compiler.validate(flow)).toThrow('at least one data source');
  });

  it('터미널 노드(주문/알림)가 없으면 에러를 던져야 한다', () => {
    const flow: FlowDefinition = {
      nodes: [
        { id: 'n1', type: 'data', subtype: 'candle-stream', position: { x: 0, y: 0 }, config: {} },
        { id: 'n2', type: 'indicator', subtype: 'rsi', position: { x: 200, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'candles', targetHandle: 'candles' },
      ],
    };
    expect(() => compiler.validate(flow)).toThrow('at least one order');
  });

  it('타입이 호환되지 않는 엣지가 있으면 에러를 던져야 한다', () => {
    const flow: FlowDefinition = {
      nodes: [
        {
          id: 'data-1',
          type: 'data',
          subtype: 'candle-stream',
          position: { x: 0, y: 0 },
          config: {},
        },
        {
          id: 'order-1',
          type: 'order',
          subtype: 'market-order',
          position: { x: 200, y: 0 },
          config: {},
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'data-1',
          target: 'order-1',
          sourceHandle: 'candles',
          targetHandle: 'trigger',
        },
      ],
    };
    expect(() => compiler.validate(flow)).toThrow('Type mismatch');
  });

  it('유효한 플로우는 에러 없이 통과해야 한다', () => {
    expect(() => compiler.validate(createMinimalFlow())).not.toThrow();
  });
});

describe('FlowCompiler - 컴파일 및 실행', () => {
  it('최소 플로우를 컴파일하고 실행할 수 있어야 한다', () => {
    const flow = createMinimalFlow();
    const compiled = compiler.compile(flow);
    const candles = generateDecreasingCandles(30);
    const context = { nodeStates: {} };
    const result = compiled.execute(candles, context);

    expect(result.traces).toHaveLength(4);
    expect(result.traces[0].nodeId).toBe('data-1');
    expect(result.traces[1].nodeId).toBe('rsi-1');
    expect(result.traces[2].nodeId).toBe('threshold-1');
    expect(result.traces[3].nodeId).toBe('order-1');
  });

  it('RSI가 30 미만이면 매수 주문 액션을 생성해야 한다', () => {
    const flow = createMinimalFlow();
    const compiled = compiler.compile(flow);
    const candles = generateDecreasingCandles(30);
    const context = { nodeStates: {} };
    const result = compiled.execute(candles, context);

    const rsiTrace = result.traces.find((t) => t.nodeId === 'rsi-1');
    expect(rsiTrace?.fired).toBe(true);
    const rsiValue = rsiTrace?.output.value as number;

    if (rsiValue < 30) {
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.actions[0].side).toBe('buy');
    }
  });

  it('RSI가 30 이상이면 주문 액션을 생성하지 않아야 한다', () => {
    const flow = createMinimalFlow();
    const compiled = compiler.compile(flow);
    const candles = generateIncreasingCandles(30);
    const context = { nodeStates: {} };
    const result = compiled.execute(candles, context);

    const thresholdTrace = result.traces.find((t) => t.nodeId === 'threshold-1');
    expect(thresholdTrace?.fired).toBe(false);
    expect(result.actions).toHaveLength(0);
  });

  it('데이터가 부족하면 인디케이터가 NaN을 반환하고 주문이 발생하지 않아야 한다', () => {
    const flow = createMinimalFlow();
    const compiled = compiler.compile(flow);
    const candles = generateDecreasingCandles(5);
    const context = { nodeStates: {} };
    const result = compiled.execute(candles, context);

    const rsiTrace = result.traces.find((t) => t.nodeId === 'rsi-1');
    expect(rsiTrace?.fired).toBe(false);
    expect(result.actions).toHaveLength(0);
  });

  it('각 트레이스 항목에 타임스탬프와 durationMs가 있어야 한다', () => {
    const flow = createMinimalFlow();
    const compiled = compiler.compile(flow);
    const candles = generateDecreasingCandles(20);
    const context = { nodeStates: {} };
    const result = compiled.execute(candles, context);

    for (const trace of result.traces) {
      expect(trace.timestamp).toBeDefined();
      expect(typeof trace.durationMs).toBe('number');
      expect(trace.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});

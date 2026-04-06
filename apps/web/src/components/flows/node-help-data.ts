export interface NodeHelpInfo {
  description: string;
  usageExample: string;
  paramHints?: Record<string, string>;
}

export const NODE_HELP: Record<string, NodeHelpInfo> = {
  'candle-stream': {
    description:
      '거래소에서 실시간 캔들(OHLCV) 데이터를 가져옵니다. 모든 지표 노드의 시작점입니다.',
    usageExample: '캔들 데이터 → RSI 지표 → 기준값 조건 → 시장가 주문',
  },
  rsi: {
    description:
      'RSI(상대강도지수)를 계산합니다. 0~100 범위의 값을 출력하며, 30 이하는 과매도, 70 이상은 과매수 신호로 활용합니다.',
    usageExample: 'RSI 값 < 30 이면 매수 신호로 사용 (기준값 조건 노드에 연결)',
    paramHints: {
      period: '계산에 사용할 캔들 개수. 기본값 14.',
      source: '가격 기준 (종가/시가/고가/저가).',
    },
  },
  macd: {
    description:
      'MACD(이동평균수렴확산)를 계산합니다. MACD 선이 시그널 선을 상향 돌파하면 매수, 하향 돌파하면 매도 신호로 활용합니다.',
    usageExample: 'MACD 값과 시그널 값을 크로스 조건 노드에 연결하여 골든크로스/데드크로스 감지',
    paramHints: {
      fastPeriod: '단기 EMA 기간. 기본값 12.',
      slowPeriod: '장기 EMA 기간. 기본값 26.',
      signalPeriod: '시그널 선 기간. 기본값 9.',
    },
  },
  bollinger: {
    description:
      '볼린저 밴드를 계산합니다. 상단/중간/하단 밴드를 출력하며 가격 변동성과 추세를 파악할 때 사용합니다.',
    usageExample: '현재 가격이 하단 밴드 아래로 떨어지면 매수 신호로 활용 (크로스 조건 연결)',
    paramHints: {
      period: '이동평균 기간. 기본값 20.',
      stdDev: '표준편차 배수. 기본값 2 (±2σ 범위).',
    },
  },
  ema: {
    description:
      'EMA(지수이동평균)를 계산합니다. 최근 데이터에 더 많은 가중치를 부여해 빠른 추세 변화를 감지합니다.',
    usageExample: '단기 EMA(9)와 장기 EMA(21)를 크로스 조건에 연결해 추세 전환 감지',
    paramHints: {
      period: '평균 계산에 사용할 캔들 개수.',
    },
  },
  threshold: {
    description:
      '숫자 값을 기준값과 비교해 조건의 참/거짓을 출력합니다. 지표 값이 특정 임계치를 넘는지 확인할 때 사용합니다.',
    usageExample: 'RSI > 70 이면 과매수 신호 → 매도 주문 트리거',
    paramHints: {
      operator: '비교 연산자: < (미만), > (초과), <= (이하), >= (이상), == (같음).',
      threshold: '비교할 기준 숫자 값.',
    },
  },
  crossover: {
    description:
      '두 숫자 값의 크로스오버(상향/하향 돌파)를 감지합니다. 값 A가 값 B를 돌파하는 순간만 참을 출력합니다.',
    usageExample: 'MACD 값이 시그널 값을 상향 돌파할 때 매수 신호 발생',
    paramHints: {
      direction: '상향 돌파(above): A가 B를 위로 돌파 / 하향 돌파(below): A가 B를 아래로 돌파.',
    },
  },
  'and-or': {
    description:
      '두 조건을 AND 또는 OR 논리로 결합합니다. 여러 조건을 동시에 만족해야 하거나(AND), 하나라도 만족하면 될 때(OR) 사용합니다.',
    usageExample: 'RSI < 30 AND MACD 골든크로스 → 두 조건 모두 만족할 때만 매수',
    paramHints: {
      operator: 'AND: 두 조건 모두 참일 때 / OR: 하나라도 참일 때.',
    },
  },
  'market-order': {
    description:
      '조건이 참일 때 시장가 주문을 실행합니다. 현재 시장 가격으로 즉시 매수 또는 매도합니다.',
    usageExample: '조건 노드 결과 → 시장가 주문 (매수 방향, 수량 0.001 BTC)',
    paramHints: {
      side: '매수(buy) 또는 매도(sell).',
      amount: '주문 수량 (코인 단위, 예: 0.001).',
    },
  },
  alert: {
    description:
      '조건이 참일 때 알림 메시지를 전송합니다. 실제 주문 없이 신호 발생 여부만 확인할 때 사용합니다.',
    usageExample: '조건 만족 시 "RSI 과매도 신호 발생!" 알림 전송',
    paramHints: {
      message: '알림으로 전송할 메시지 내용.',
    },
  },
};

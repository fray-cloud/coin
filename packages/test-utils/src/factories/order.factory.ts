export interface MockOrder {
  id: string;
  userId: string;
  exchangeKeyId: string | null;
  exchange: string;
  symbol: string;
  side: string;
  type: string;
  mode: string;
  status: string;
  quantity: string;
  price: string | null;
  exchangeOrderId: string | null;
  filledQuantity: string;
  filledPrice: string;
  fee: string;
  feeCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}

let orderCounter = 0;

export function createMockOrder(overrides: Partial<MockOrder> = {}): MockOrder {
  orderCounter++;
  return {
    id: `order-${orderCounter}`,
    userId: 'user-1',
    exchangeKeyId: 'key-1',
    exchange: 'upbit',
    symbol: 'KRW-BTC',
    side: 'buy',
    type: 'market',
    mode: 'paper',
    status: 'pending',
    quantity: '0.001',
    price: null,
    exchangeOrderId: null,
    filledQuantity: '0',
    filledPrice: '0',
    fee: '0',
    feeCurrency: '',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function resetOrderCounter() {
  orderCounter = 0;
}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RiskService } from './risk.service';

// Mock PrismaService
const mockPrisma = {
  order: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
};

describe('RiskService', () => {
  let service: RiskService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create instance bypassing NestJS DI
    service = new RiskService(mockPrisma as never);
  });

  describe('checkRisk - all pass', () => {
    it('should allow when no risk config is set', async () => {
      const result = await service.checkRisk(
        'user-1',
        'upbit',
        'KRW-BTC',
        'buy',
        '0.001',
        50000000,
        {},
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('stopLoss', () => {
    it('should block buy when stop-loss triggered', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        filledPrice: '50000000', // Bought at 50M
      });

      // Current price is 40M → 20% loss
      const result = await service.checkRisk(
        'user-1',
        'upbit',
        'KRW-BTC',
        'buy',
        '0.001',
        40000000,
        {
          stopLossPercent: 10,
        },
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Stop-loss triggered');
    });

    it('should allow when loss is below threshold', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        filledPrice: '50000000',
      });

      // Current price is 48M → 4% loss, threshold is 10%
      const result = await service.checkRisk(
        'user-1',
        'upbit',
        'KRW-BTC',
        'buy',
        '0.001',
        48000000,
        {
          stopLossPercent: 10,
        },
      );

      expect(result.allowed).toBe(true);
    });

    it('should allow when no previous buy order exists', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const result = await service.checkRisk(
        'user-1',
        'upbit',
        'KRW-BTC',
        'buy',
        '0.001',
        40000000,
        {
          stopLossPercent: 10,
        },
      );

      expect(result.allowed).toBe(true);
    });

    it('should skip stop-loss check for sell signals', async () => {
      const result = await service.checkRisk(
        'user-1',
        'upbit',
        'KRW-BTC',
        'sell',
        '0.001',
        40000000,
        {
          stopLossPercent: 10,
        },
      );

      expect(result.allowed).toBe(true);
      expect(mockPrisma.order.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('dailyMaxLoss', () => {
    it('should block when daily loss exceeds limit', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null); // no stop-loss data
      mockPrisma.order.findMany.mockResolvedValue([
        { side: 'buy', filledPrice: '100', filledQuantity: '1', fee: '0.1' },
        { side: 'sell', filledPrice: '80', filledQuantity: '1', fee: '0.1' },
      ]);

      // PnL: sell(80-0.1) - buy(100+0.1) = 79.9 - 100.1 = -20.2
      const result = await service.checkRisk('user-1', 'upbit', 'KRW-BTC', 'buy', '0.001', 50000, {
        dailyMaxLossUsd: 15,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily loss limit');
    });

    it('should allow when daily loss is below limit', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        { side: 'buy', filledPrice: '100', filledQuantity: '1', fee: '0.1' },
        { side: 'sell', filledPrice: '98', filledQuantity: '1', fee: '0.1' },
      ]);

      const result = await service.checkRisk('user-1', 'upbit', 'KRW-BTC', 'buy', '0.001', 50000, {
        dailyMaxLossUsd: 50,
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('maxPositionSize', () => {
    it('should block when position exceeds max size', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.order.findMany.mockResolvedValue([
        { side: 'buy', filledQuantity: '0.5' },
        { side: 'buy', filledQuantity: '0.3' },
        { side: 'sell', filledQuantity: '0.1' },
      ]);

      // Net position: 0.5 + 0.3 - 0.1 = 0.7, new buy of 0.5 → 1.2 > max 1.0
      const result = await service.checkRisk('user-1', 'upbit', 'KRW-BTC', 'buy', '0.5', 50000000, {
        maxPositionSize: '1.0',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Position size limit');
    });

    it('should allow when position is within limit', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.order.findMany.mockResolvedValue([{ side: 'buy', filledQuantity: '0.3' }]);

      const result = await service.checkRisk('user-1', 'upbit', 'KRW-BTC', 'buy', '0.2', 50000000, {
        maxPositionSize: '1.0',
      });

      expect(result.allowed).toBe(true);
    });

    it('should skip max position check for sell signals', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.checkRisk(
        'user-1',
        'upbit',
        'KRW-BTC',
        'sell',
        '0.5',
        50000000,
        {
          maxPositionSize: '0.1',
        },
      );

      expect(result.allowed).toBe(true);
    });
  });
});

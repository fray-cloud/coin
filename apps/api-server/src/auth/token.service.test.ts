import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';

const mockJwt = {
  sign: vi.fn().mockReturnValue('mock-token'),
  verify: vi.fn(),
};
const mockConfig = {
  get: vi.fn((key: string, fallback?: string) => {
    const map: Record<string, string> = {
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
      JWT_ACCESS_EXPIRES_IN: '15m',
      NODE_ENV: 'test',
    };
    return map[key] ?? fallback;
  }),
};
const mockPrisma = {
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: { findUnique: vi.fn() },
};

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TokenService(mockJwt as never, mockConfig as never, mockPrisma as never);
  });

  describe('토큰 쌍 발급 (issueTokenPair)', () => {
    it('액세스 토큰과 리프레시 토큰을 발급해야 한다', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.issueTokenPair({ id: 'u1', email: 'test@test.com' } as never);
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('리프레시 토큰 갱신 (rotateRefreshToken)', () => {
    it('토큰을 갱신하고 새 토큰 쌍을 반환해야 한다', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'u1', jti: 'raw-token' });
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ id: 'rt1', userId: 'u1' });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@test.com' });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.rotateRefreshToken('old-refresh-token');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalled();
    });

    it('유효하지 않은 리프레시 토큰이면 예외를 던져야 한다', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.rotateRefreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('저장된 토큰을 찾을 수 없으면 예외를 던져야 한다', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'u1', jti: 'raw' });
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.rotateRefreshToken('token')).rejects.toThrow(UnauthorizedException);
    });

    it('토큰 검증 후 사용자를 찾을 수 없으면 예외를 던져야 한다', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'u1', jti: 'raw' });
      mockPrisma.refreshToken.findUnique.mockResolvedValue({ id: 'rt1', userId: 'u1' });
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.rotateRefreshToken('token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('리프레시 토큰 폐기 (revokeRefreshToken)', () => {
    it('저장된 토큰을 삭제해야 한다', async () => {
      mockJwt.verify.mockReturnValue({ jti: 'raw' });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});

      await service.revokeRefreshToken('token');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it('유효하지 않은 토큰이어도 예외를 던지지 않아야 한다', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.revokeRefreshToken('bad')).resolves.not.toThrow();
    });
  });
});

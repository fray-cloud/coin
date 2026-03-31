import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$hashed$'),
  compare: vi.fn(),
}));

const mockPrisma = {
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  account: { findUnique: vi.fn(), create: vi.fn() },
  $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(mockPrisma)),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(mockPrisma as never);
  });

  describe('회원가입 (signup)', () => {
    it('새 사용자를 생성해야 한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'u1', email: 'test@test.com' });

      const result = await service.signup({ email: 'test@test.com', password: 'pass123' } as never);
      expect(result.id).toBe('u1');
      expect(bcrypt.hash).toHaveBeenCalledWith('pass123', 10);
    });

    it('이미 비밀번호로 등록된 이메일이면 ConflictException을 던져야 한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', password: '$existing$' });

      await expect(
        service.signup({ email: 'test@test.com', password: 'pass' } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('기존 OAuth 사용자에 비밀번호를 업데이트해야 한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', password: null, nickname: 'old' });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', password: '$hashed$' });

      const result = await service.signup({ email: 'test@test.com', password: 'pass' } as never);
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(result.id).toBe('u1');
    });
  });

  describe('로컬 사용자 검증 (validateLocalUser)', () => {
    it('유효한 자격증명이면 사용자를 반환해야 한다', async () => {
      const user = { id: 'u1', email: 'test@test.com', password: '$hashed$' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await service.validateLocalUser('test@test.com', 'pass');
      expect(result).toEqual(user);
    });

    it('존재하지 않는 사용자이면 예외를 던져야 한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateLocalUser('x@x.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('비밀번호가 틀리면 예외를 던져야 한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', password: '$hashed$' });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(service.validateLocalUser('test@test.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('OAuth 사용자 검증 (validateOAuthUser)', () => {
    it('계정이 존재하면 기존 사용자를 반환해야 한다', async () => {
      const user = { id: 'u1', email: 'test@test.com' };
      mockPrisma.account.findUnique.mockResolvedValue({ user });

      const result = await service.validateOAuthUser('google', 'gid-1', {
        email: 'test@test.com',
      });
      expect(result).toEqual(user);
    });

    it('이메일로 기존 사용자에 계정을 연결해야 한다', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);
      const user = { id: 'u1', email: 'test@test.com' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.account.create.mockResolvedValue({});

      const result = await service.validateOAuthUser('google', 'gid-1', {
        email: 'test@test.com',
      });
      expect(result).toEqual(user);
      expect(mockPrisma.account.create).toHaveBeenCalled();
    });

    it('일치하는 계정이 없으면 새 사용자와 계정을 생성해야 한다', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const newUser = { id: 'u2', email: 'new@test.com' };
      mockPrisma.user.create.mockResolvedValue(newUser);
      mockPrisma.account.create.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn(mockPrisma),
      );

      const result = await service.validateOAuthUser('kakao', 'kid-1', {
        email: 'new@test.com',
        nickname: 'newbie',
      });
      expect(result).toEqual(newUser);
    });
  });

  describe('사용자 조회 (getUserById)', () => {
    it('사용자를 반환해야 한다', async () => {
      const user = { id: 'u1' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      expect(await service.getUserById('u1')).toEqual(user);
    });

    it('찾을 수 없으면 null을 반환해야 한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await service.getUserById('x')).toBeNull();
    });
  });
});

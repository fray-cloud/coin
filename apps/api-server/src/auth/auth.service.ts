import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import type { User } from '@coin/database';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async signup(dto: SignupDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing?.password) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: { password: hashedPassword, nickname: dto.nickname ?? existing.nickname },
      });
    }

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        nickname: dto.nickname,
      },
    });
  }

  async validateLocalUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async validateOAuthUser(
    provider: string,
    providerAccountId: string,
    profile: { email: string; nickname?: string; profileImage?: string },
  ): Promise<User> {
    const account = await this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });

    if (account) {
      return account.user;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      await this.prisma.account.create({
        data: {
          userId: existingUser.id,
          provider,
          providerAccountId,
        },
      });
      this.logger.log(`Linked ${provider} account to existing user ${existingUser.email}`);
      return existingUser;
    }

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: profile.email,
          nickname: profile.nickname,
          profileImage: profile.profileImage,
        },
      });
      await tx.account.create({
        data: {
          userId: user.id,
          provider,
          providerAccountId,
        },
      });
      return user;
    });

    this.logger.log(`Created new user via ${provider}: ${profile.email}`);
    return newUser;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

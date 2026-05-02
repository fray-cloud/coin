import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '@coin/utils';

@Injectable()
export class ClaudeTokensService {
  private readonly logger = new Logger(ClaudeTokensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get masterKey(): string {
    return this.config.getOrThrow<string>('ENCRYPTION_MASTER_KEY');
  }

  async getStatus(userId: string): Promise<{ registered: boolean; updatedAt?: Date }> {
    const row = await this.prisma.claudeToken.findUnique({ where: { userId } });
    if (!row) return { registered: false };
    return { registered: true, updatedAt: row.updatedAt };
  }

  async save(userId: string, token: string): Promise<{ updatedAt: Date }> {
    const encrypted = encrypt(token, this.masterKey);
    const row = await this.prisma.claudeToken.upsert({
      where: { userId },
      update: { encryptedToken: encrypted },
      create: { userId, encryptedToken: encrypted },
    });
    this.logger.log(`Claude token saved for user ${userId}`);
    return { updatedAt: row.updatedAt };
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.claudeToken.delete({ where: { userId } }).catch(() => {
      throw new NotFoundException('Claude token not registered');
    });
    this.logger.log(`Claude token deleted for user ${userId}`);
  }

  /** Decrypt and return the raw OAuth token. Use only at LLM call time. */
  async getDecrypted(userId: string): Promise<string> {
    const row = await this.prisma.claudeToken.findUnique({ where: { userId } });
    if (!row) throw new NotFoundException('Claude token not registered');
    return decrypt(row.encryptedToken, this.masterKey);
  }
}

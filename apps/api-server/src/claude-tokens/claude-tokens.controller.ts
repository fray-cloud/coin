import { Body, Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClaudeTokensService } from './claude-tokens.service';
import { SaveClaudeTokenDto } from './dto/save-claude-token.dto';

@ApiTags('Claude Tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('claude-tokens')
export class ClaudeTokensController {
  constructor(private readonly service: ClaudeTokensService) {}

  @Get()
  @ApiOperation({ summary: 'Check if a Claude OAuth token is registered for the user' })
  status(@CurrentUser() user: { id: string }) {
    return this.service.getStatus(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save / replace the user Claude OAuth token (encrypted at rest)' })
  save(@CurrentUser() user: { id: string }, @Body() dto: SaveClaudeTokenDto) {
    return this.service.save(user.id, dto.token);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete the user Claude OAuth token' })
  @HttpCode(204)
  async remove(@CurrentUser() user: { id: string }) {
    await this.service.delete(user.id);
  }
}

import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveClaudeTokenDto {
  @ApiProperty({
    description: 'Claude Code OAuth long-lived token (run `claude setup-token`)',
    example: 'sk-ant-oat01-...',
  })
  @IsString()
  @MinLength(20)
  token!: string;
}

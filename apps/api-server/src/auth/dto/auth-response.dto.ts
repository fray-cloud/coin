import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponse {
  @ApiProperty({ description: '사용자 ID', example: 'cmn4lcz9m0003qe7n...' })
  id!: string;

  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ description: '닉네임', example: 'trader_kim' })
  nickname!: string | null;

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  profileImage!: string | null;
}

export class AuthMessageResponse {
  @ApiProperty({ description: '결과 메시지', example: 'Logged out' })
  message!: string;
}

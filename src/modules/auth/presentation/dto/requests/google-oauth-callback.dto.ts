import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleOAuthCallbackDto {
  @ApiProperty({
    example: 'abc123...',
    description: 'OAuth authorization code',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'xyz789...', description: 'OAuth state token' })
  @IsString()
  @IsNotEmpty()
  state: string;
}

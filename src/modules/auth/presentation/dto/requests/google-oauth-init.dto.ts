import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GoogleOAuthInitDto {
  @ApiPropertyOptional({
    example: 'http://localhost:3000/dashboard',
    description: 'URL to redirect to after OAuth completes',
  })
  @IsOptional()
  @IsUrl()
  redirectUrl?: string;
}

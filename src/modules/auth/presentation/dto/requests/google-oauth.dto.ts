import { IsOptional, IsString, IsUrl } from 'class-validator';

/**
 * DTO for initiating Google OAuth flow
 */
export class GoogleOAuthInitDto {
  @IsOptional()
  @IsUrl()
  @IsString()
  redirectUrl?: string;
}

/**
 * DTO for Google OAuth callback
 */
export class GoogleOAuthCallbackDto {
  @IsString()
  code: string;

  @IsString()
  state: string;
}

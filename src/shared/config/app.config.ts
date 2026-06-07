import 'dotenv/config';

interface AppConfig {
  jwt_access_secret: string;
  jwt_refresh_secret: string;
  redis_cache_key_prefix: string;
  node_env: string;
  port: number;
  email_host: string;
  email_port: number;
  email_user: string;
  email_pass: string;
  email_from: string;
  // Google OAuth
  google_client_id: string;
  google_client_secret: string;
  google_redirect_uri: string;
}

const config: AppConfig = {
  jwt_access_secret:
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '',
  jwt_refresh_secret:
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
  redis_cache_key_prefix: process.env.REDIS_CACHE_KEY_PREFIX || 'app',
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  email_host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  email_port: parseInt(process.env.EMAIL_PORT || '587', 10),
  email_user: process.env.EMAIL_USER || '',
  email_pass: process.env.EMAIL_PASS || '',
  email_from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
  // Google OAuth
  google_client_id: process.env.GOOGLE_CLIENT_ID || '',
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
  google_redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
};

export default config;

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription(
      'Production-ready NestJS API with Prisma, PostgreSQL, Authentication, Logging, Monitoring, and more.',
    )
    .setVersion('1.0.0')
    .setContact(
      'API Support',
      'https://github.com/the-pujon/nestjs-prisma-postgres-starter',
      '',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    // Add JWT Bearer authentication globally
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth', // This is the security name
    )
    // Add common tags for organization
    .addTag('auth', 'Authentication and authorization endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('health', 'Health check endpoints')
    .addTag('metrics', 'Metrics and monitoring endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // Global API response decorator
    extraModels: [],
  });

  // Customize Swagger UI
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'NestJS API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { margin: 20px 0 }
    `,
    swaggerOptions: {
      persistAuthorization: true, // Persist authorization data on page refresh
      docExpansion: 'none', // Collapse all sections by default
      filter: true, // Enable search filter
      showRequestDuration: true, // Show request duration
      tryItOutEnabled: true, // Enable "Try it out" by default
      tagsSorter: 'alpha', // Sort tags alphabetically
      operationsSorter: 'alpha', // Sort operations alphabetically
    },
  });
}

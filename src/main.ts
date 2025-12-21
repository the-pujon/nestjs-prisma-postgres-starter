import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log('Application is starting...');
  await app.listen(process.env.PORT ?? 3000);
  // eslint-disable-next-line prettier/prettier
  console.log(
    `Application is running successfully on: ${await app.getUrl()}`,
  );
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});

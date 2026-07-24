import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './modules/app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const config = app.get(ConfigService);
  app.enableShutdownHooks();
  await app.listen(config.getOrThrow<string>('PORT'), '0.0.0.0');
}
bootstrap();

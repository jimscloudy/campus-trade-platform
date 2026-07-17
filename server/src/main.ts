import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

loadEnv({ path: join(process.cwd(), '.env') });
loadEnv({ path: join(process.cwd(), '..', '.env') });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`Campus Trade API on http://0.0.0.0:${port}/api`);
}
bootstrap();

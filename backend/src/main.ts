import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global input validation: rejects unknown fields, auto-transforms DTOs.
  app.useGlobalPipes(createValidationPipe());

  await app.listen(3000);
}
bootstrap();

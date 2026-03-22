// OTel SDK must start before NestJS modules are imported
// so instrumentations can hook into http/nest/typeorm
import './trace';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(8001);
}
bootstrap();

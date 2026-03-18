import Pyroscope from '@pyroscope/nodejs';

Pyroscope.init({
  serverAddress: process.env.PYROSCOPE_SERVER_ADDRESS || 'http://pyroscope:4040',
  appName: 'point-service',
});
Pyroscope.start();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { otelSDK } from './trace';

async function bootstrap() {
  await otelSDK.start();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(8001);
}
bootstrap();

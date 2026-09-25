import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap(...args: any[]) {
  console.log('args@bootstrap', args);
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

export default bootstrap;

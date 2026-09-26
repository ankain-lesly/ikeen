// import { NestFactory } from '@nestjs/core';
// import { ValidationPipe } from '@nestjs/common';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.enableCors({
//     origin: true,
//     credentials: true,
//   });

//   app.setGlobalPrefix('api/v1');

//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       transform: true,
//       forbidNonWhitelisted: true,
//     }),
//   );

//   const port = process.env.PORT ?? 3000;
//   await app.listen(port);
// }
// await bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js'; // Note the explicit .js extension
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

export const createServer = async () => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  await app.init();
  return server;
};

export default async function handler(req: any, res: any) {
  await createServer();
  server(req, res);
}
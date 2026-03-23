import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.API_SERVER_PORT || 3000;
  await app.listen(port);
  console.log(`api-server running on port ${port}`);
}
bootstrap();

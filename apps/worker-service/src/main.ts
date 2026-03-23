import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log('worker-service started');
  // Kafka microservice transport will be configured in Phase 1
}
bootstrap();

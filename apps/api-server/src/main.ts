import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // API Documentation — dev only
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Coin Trading Platform API')
      .setDescription(
        'Cryptocurrency monitoring, trading, and strategy automation API\n\n' +
          '## Architecture\n\n' +
          '```mermaid\n' +
          'graph LR\n' +
          '  Client[Web Client] --> Nginx\n' +
          '  Nginx --> API[API Server]\n' +
          '  Nginx --> Web[Next.js]\n' +
          '  API --> DB[(PostgreSQL)]\n' +
          '  API --> Redis[(Redis)]\n' +
          '  API --> Kafka[Kafka]\n' +
          '  Kafka --> Worker[Worker Service]\n' +
          '  Worker --> Exchanges[Exchange APIs]\n' +
          '```\n',
      )
      .setVersion('1.0')
      .addServer('/api', 'API via Nginx reverse proxy')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();
    const document = SwaggerModule.createDocument(app, config);

    // Serve OpenAPI JSON
    app.use('/docs/openapi.json', (_req: any, res: any) => res.json(document));

    // Scalar API Reference UI
    app.use(
      '/docs',
      apiReference({
        content: document,
        theme: 'deepSpace',
      }),
    );
  }

  const port = process.env.API_SERVER_PORT || 3000;
  await app.listen(port);
  app.get(Logger).log(`api-server running on port ${port}`);
}
bootstrap();

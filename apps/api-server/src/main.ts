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
      .setTitle('코인 트레이딩 플랫폼 API')
      .setDescription(
        '암호화폐 모니터링, 거래, 전략 자동화 API\n\n' +
          '## 아키텍처\n\n' +
          '```mermaid\n' +
          'graph LR\n' +
          '  Client[웹 클라이언트] --> Nginx\n' +
          '  Nginx --> API[API Server]\n' +
          '  Nginx --> Web[Next.js]\n' +
          '  API --> DB[(PostgreSQL)]\n' +
          '  API --> Redis[(Redis)]\n' +
          '  API --> Kafka[Kafka]\n' +
          '  Kafka --> Worker[Worker Service]\n' +
          '  Worker --> Exchanges[거래소 API]\n' +
          '```\n',
      )
      .setVersion('1.0')
      .addServer('/api', 'Nginx 리버스 프록시를 통한 API 접근')
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

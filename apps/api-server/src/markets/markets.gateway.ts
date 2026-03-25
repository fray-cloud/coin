import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MarketsService } from './markets.service';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? (process.env.WS_CORS_ORIGINS ?? '')
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : '*',
  },
})
export class MarketsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MarketsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly marketsService: MarketsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit() {
    this.marketsService.onTicker((ticker) => {
      this.server.emit('ticker', ticker);
    });

    this.marketsService.onOrderUpdate((payload) => {
      this.server.to(`user:${payload.userId}`).emit('order:updated', {
        orderId: payload.orderId,
        status: payload.status,
        filledQuantity: payload.filledQuantity,
        filledPrice: payload.filledPrice,
        fee: payload.fee,
        feeCurrency: payload.feeCurrency,
      });
    });

    this.marketsService.onStrategySignal((payload) => {
      this.server.to(`user:${payload.userId}`).emit('strategy:signal', {
        strategyId: payload.strategyId,
        exchange: payload.exchange,
        symbol: payload.symbol,
        signal: payload.signal,
        strategyType: payload.strategyType,
        reason: payload.reason,
      });
    });

    this.notificationsService.onNotification((payload) => {
      this.server.to(`user:${payload.userId}`).emit('notification:received', {
        type: payload.type,
        title: payload.title,
        message: payload.message,
      });
    });

    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    // userId를 handshake query에서 추출하여 room join
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(`user:${userId}`);
      this.logger.debug(`Client ${client.id} joined room user:${userId}`);
    }
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }
}

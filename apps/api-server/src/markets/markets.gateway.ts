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

@WebSocketGateway({
  path: '/ws',
  cors: { origin: '*' },
})
export class MarketsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MarketsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly marketsService: MarketsService) {}

  afterInit() {
    this.marketsService.onTicker((ticker) => {
      this.server.emit('ticker', ticker);
    });
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }
}

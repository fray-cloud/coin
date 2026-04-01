import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFlowCommand } from './create-flow.command';
import { FLOW_LIMITS, NODE_TYPE_REGISTRY } from '@coin/types';

@CommandHandler(CreateFlowCommand)
export class CreateFlowHandler implements ICommandHandler<CreateFlowCommand> {
  private readonly logger = new Logger(CreateFlowHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateFlowCommand) {
    const { userId, dto } = command;
    const { definition } = dto;

    this.validateDefinition(definition);

    if (dto.tradingMode === 'real' && !dto.exchangeKeyId) {
      throw new BadRequestException('exchangeKeyId is required for real trading mode');
    }

    if (dto.tradingMode === 'real' && dto.exchangeKeyId) {
      const key = await this.prisma.exchangeKey.findFirst({
        where: { id: dto.exchangeKeyId, userId },
      });
      if (!key) throw new NotFoundException('Exchange key not found');
    }

    const flow = await this.prisma.flow.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description || null,
        definition: definition as never,
        exchange: dto.exchange,
        symbol: dto.symbol,
        candleInterval: dto.candleInterval || '1h',
        tradingMode: dto.tradingMode || 'paper',
        exchangeKeyId: dto.tradingMode === 'real' ? dto.exchangeKeyId : null,
        riskConfig: (dto.riskConfig || {}) as never,
      },
    });

    this.logger.log(`Flow created: ${flow.id} (${dto.name})`);
    return flow;
  }

  private validateDefinition(definition: CreateFlowCommand['dto']['definition']) {
    if (!definition?.nodes || !definition?.edges) {
      throw new BadRequestException('definition must contain nodes and edges arrays');
    }

    if (definition.nodes.length > FLOW_LIMITS.MAX_NODES) {
      throw new BadRequestException(`Maximum ${FLOW_LIMITS.MAX_NODES} nodes allowed`);
    }

    if (definition.edges.length > FLOW_LIMITS.MAX_EDGES) {
      throw new BadRequestException(`Maximum ${FLOW_LIMITS.MAX_EDGES} edges allowed`);
    }

    const nodeIds = new Set(definition.nodes.map((n) => n.id));
    if (nodeIds.size !== definition.nodes.length) {
      throw new BadRequestException('Duplicate node IDs found');
    }

    for (const node of definition.nodes) {
      if (!NODE_TYPE_REGISTRY[node.subtype]) {
        throw new BadRequestException(`Unknown node subtype: ${node.subtype}`);
      }
    }

    for (const edge of definition.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        throw new BadRequestException(`Edge references unknown node: ${edge.id}`);
      }
    }
  }
}

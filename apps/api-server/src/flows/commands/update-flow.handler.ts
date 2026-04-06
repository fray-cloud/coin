import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateFlowCommand } from './update-flow.command';
import { FLOW_LIMITS, NODE_TYPE_REGISTRY } from '@coin/types';

@CommandHandler(UpdateFlowCommand)
export class UpdateFlowHandler implements ICommandHandler<UpdateFlowCommand> {
  private readonly logger = new Logger(UpdateFlowHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateFlowCommand) {
    const { userId, id, dto } = command;

    const flow = await this.prisma.flow.findFirst({
      where: { id, userId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    if (dto.definition) {
      this.validateDefinition(dto.definition);
    }

    if (dto.tradingMode === 'real' && !dto.exchangeKeyId && !flow.exchangeKeyId) {
      throw new BadRequestException('exchangeKeyId is required for real trading mode');
    }

    if (dto.exchangeKeyId) {
      const key = await this.prisma.exchangeKey.findFirst({
        where: { id: dto.exchangeKeyId, userId },
      });
      if (!key) throw new NotFoundException('Exchange key not found');
    }

    const updated = await this.prisma.flow.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.definition !== undefined && { definition: dto.definition as never }),
        ...(dto.candleInterval !== undefined && { candleInterval: dto.candleInterval }),
        ...(dto.tradingMode !== undefined && { tradingMode: dto.tradingMode }),
        ...(dto.exchangeKeyId !== undefined && {
          exchangeKeyId: dto.tradingMode === 'real' ? dto.exchangeKeyId : null,
        }),
        ...(dto.riskConfig !== undefined && { riskConfig: dto.riskConfig as never }),
      },
    });

    this.logger.log(`Flow updated: ${id}`);
    return updated;
  }

  private validateDefinition(definition: NonNullable<UpdateFlowCommand['dto']['definition']>) {
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

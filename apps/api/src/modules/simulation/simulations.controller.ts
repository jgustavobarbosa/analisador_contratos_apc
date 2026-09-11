import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CurrentUser,
  RequireAnyPermissions,
  RequirePermissions,
  TenantId,
} from '../identity/auth/auth.decorators';
import type { AuthUser } from '../identity/auth/auth.types';
import {
  CreateSimulationBatchDto,
  CreateSimulationDto,
} from './simulation.dto';
import { SimulationService } from './simulation.service';

@ApiTags('simulations')
@Controller('simulations')
export class SimulationsController {
  constructor(private readonly simulations: SimulationService) {}

  @Post()
  @HttpCode(200)
  @RequirePermissions('simulation:run')
  run(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSimulationDto,
  ) {
    return this.simulations.runOne(tenantId, user.id, dto);
  }

  @Post('batch')
  @HttpCode(200)
  @RequirePermissions('simulation:run')
  async runBatch(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ) {
    const items = await this.parseBatchItems(body);
    return this.simulations.runBatch(tenantId, user.id, items);
  }

  @Get()
  @RequireAnyPermissions('simulation:read', 'simulation:run')
  list(
    @TenantId() tenantId: string,
    @Query('contractId') contractId?: string,
    @Query('limit') limitRaw?: string,
  ) {
    if (!contractId) {
      throw new BadRequestException('Query "contractId" is required');
    }
    const limit = limitRaw ? Number(limitRaw) : 50;
    if (!Number.isFinite(limit) || limit < 1) {
      throw new BadRequestException('Invalid limit');
    }
    return this.simulations.list(tenantId, contractId, Math.floor(limit));
  }

  private async parseBatchItems(body: unknown): Promise<CreateSimulationDto[]> {
    let rawItems: unknown;
    if (Array.isArray(body)) {
      rawItems = body;
    } else if (
      body &&
      typeof body === 'object' &&
      Array.isArray((body as CreateSimulationBatchDto).items)
    ) {
      rawItems = (body as CreateSimulationBatchDto).items;
    } else {
      throw new BadRequestException(
        'Body must be an array of simulations or { items: [...] }',
      );
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new BadRequestException('Batch requires at least one item');
    }
    if (rawItems.length > 200) {
      throw new BadRequestException('Batch limited to 200 items');
    }

    const items = plainToInstance(CreateSimulationDto, rawItems);
    for (let i = 0; i < items.length; i++) {
      const errors = await validate(items[i]);
      if (errors.length > 0) {
        throw new BadRequestException(
          `items[${i}] invalid: ${errors
            .map((e) => Object.values(e.constraints ?? {}).join(', '))
            .join('; ')}`,
        );
      }
    }
    return items;
  }
}

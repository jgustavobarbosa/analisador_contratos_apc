import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  TenantId,
} from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.types';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('user:read')
  list(@TenantId() tenantId: string) {
    return this.users.list(tenantId);
  }

  @Post()
  @RequirePermissions('user:write')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.create(tenantId, dto, actor);
  }

  @Patch(':id')
  @RequirePermissions('user:write')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.update(tenantId, id, dto, actor);
  }

  @Post(':id/disable')
  @HttpCode(200)
  @RequirePermissions('user:write')
  disable(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.users.disable(tenantId, id, actor);
  }
}

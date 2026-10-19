import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ModuleKey } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedRequest } from './auth.types';
import { MODULE_KEY } from './module.decorator';

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const moduleKey = this.reflector.getAllAndOverride<ModuleKey>(MODULE_KEY, [context.getHandler(), context.getClass()]);
    if (!moduleKey) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const access = await this.db.organizationModule.findFirst({
      where: { organizationId: request.identity.organizationId, enabled: true, module: { key: moduleKey, active: true } },
      select: { id: true },
    });
    if (!access) throw new ForbiddenException(`O módulo ${moduleKey} não está habilitado para esta empresa`);
    return true;
  }
}

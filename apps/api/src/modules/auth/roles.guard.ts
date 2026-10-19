import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest, MembershipRole } from './auth.types';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!roles.includes(request.identity.role)) throw new ForbiddenException('Seu usuário não tem permissão para esta ação');
    return true;
  }
}

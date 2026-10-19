import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const origin = req.headers.origin;
      const allowed = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
      if (origin && origin !== allowed) throw new ForbiddenException('Origem não autorizada');
    }
    req.identity = this.auth.readCookie(req.headers.cookie);
    const [organization, user, membership] = await Promise.all([
      this.db.organization.findUnique({ where: { id: req.identity.organizationId }, select: { active: true } }),
      this.db.user.findUnique({ where: { id: req.identity.userId }, select: { active: true } }),
      this.db.membership.findUnique({ where: { organizationId_userId: { organizationId: req.identity.organizationId, userId: req.identity.userId } }, select: { role: true } }),
    ]);
    if (!user?.active) throw new ForbiddenException('Usuário inativo');
    if (!organization?.active) throw new ForbiddenException('Empresa inativa. Solicite a reativação ao administrador.');
    if (!membership || membership.role !== req.identity.role) throw new ForbiddenException('Sessão desatualizada. Entre novamente.');
    return true;
  }
}

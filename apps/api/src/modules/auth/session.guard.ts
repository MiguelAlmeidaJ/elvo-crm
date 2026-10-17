import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const origin = req.headers.origin;
      const allowed = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
      if (origin && origin !== allowed) throw new ForbiddenException('Origem não autorizada');
    }
    req.identity = this.auth.readCookie(req.headers.cookie);
    return true;
  }
}

import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../../database/prisma.service';

const scrypt = promisify(scryptCb);
const COOKIE_NAME = 'elvo_session';
type Identity = { userId: string; organizationId: string; role: string };
@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService) {}
  private secret() {
    const key = process.env.SESSION_SECRET;
    if (!key || key.length < 32) throw new Error('SESSION_SECRET deve conter no mínimo 32 caracteres');
    return key;
  }
  async hash(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = (await scrypt(password, salt, 64) as Buffer).toString('hex');
    return salt + ':' + hash;
  }
  async verify(password: string, stored: string) {
    const [salt, hex] = stored.split(':');
    if (!salt || !hex || !/^[a-f0-9]{128}$/.test(hex)) return false;
    const actual = await scrypt(password, salt, 64) as Buffer;
    return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
  }
  private sign(identity: Identity) {
    const payload = Buffer.from(JSON.stringify({ ...identity, exp: Date.now() + 7 * 86400000 })).toString('base64url');
    const sig = createHmac('sha256', this.secret()).update(payload).digest('base64url');
    return payload + '.' + sig;
  }
  readCookie(cookieHeader?: string): Identity {
    const cookie = cookieHeader?.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE_NAME + '='));
    const value = cookie?.slice(COOKIE_NAME.length + 1);
    const [payload, sig] = value?.split('.') ?? [];
    if (!payload || !sig) throw new UnauthorizedException('Entre na sua conta');
    const expected = createHmac('sha256', this.secret()).update(payload).digest();
    let provided: Buffer;
    try { provided = Buffer.from(sig, 'base64url'); } catch { throw new UnauthorizedException(); }
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new UnauthorizedException();
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (typeof data.exp !== 'number' || data.exp < Date.now() ||
        typeof data.userId !== 'string' || typeof data.organizationId !== 'string') throw new Error('invalid');
      return { userId: data.userId, organizationId: data.organizationId, role: data.role };
    } catch { throw new UnauthorizedException('Sessão expirada'); }
  }
  sessionCookie(identity: Identity) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return COOKIE_NAME + '=' + this.sign(identity) + '; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800' + secure;
  }
  clearCookie() {
    return COOKIE_NAME + '=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0' + (process.env.NODE_ENV === 'production' ? '; Secure' : '');
  }
  async bootstrap(input: { key: string; name: string; email: string; password: string; organization: string }) {
    if (!process.env.SETUP_KEY || input.key !== process.env.SETUP_KEY) throw new UnauthorizedException('Chave inválida');
    if (await this.db.user.count()) throw new ConflictException('Instalação já inicializada');
    const email = input.email.toLowerCase().trim();
    const passwordHash = await this.hash(input.password);
    const slug = 'anoar-' + randomBytes(4).toString('hex');
    await this.db.$transaction(async tx => {
      if (await tx.user.count()) throw new ConflictException('Instalação já inicializada');
      const org = await tx.organization.create({ data: { name: input.organization.trim(), slug } });
      await tx.user.create({ data: { name: input.name.trim(), email, passwordHash,
        memberships: { create: { organizationId: org.id, role: 'OWNER' } } } });
    });
    return { ok: true };
  }
  async login(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase().trim() },
      include: { memberships: { orderBy: { createdAt: 'asc' }, take: 1, include: { organization: true } } } });
    if (!user?.passwordHash || !(await this.verify(password, user.passwordHash))) throw new UnauthorizedException('Credenciais inválidas');
    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('Usuário sem organização');
    return { identity: { userId: user.id, organizationId: membership.organizationId, role: membership.role },
      user: { id: user.id, name: user.name, email: user.email, role: membership.role, organization: membership.organization.name } };
  }
  async me(id: Identity) {
    const member = await this.db.membership.findUnique({ where: { organizationId_userId: { organizationId: id.organizationId, userId: id.userId } },
      include: { user: true, organization: true } });
    if (!member) throw new UnauthorizedException();
    return { id: member.user.id, name: member.user.name, email: member.user.email, role: member.role, organization: member.organization.name };
  }
}

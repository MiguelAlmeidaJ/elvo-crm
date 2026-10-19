import { Body, ConflictException, Controller, Get, HttpCode, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { ModuleKey } from '@prisma/client';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedRequest, MembershipRole } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionGuard } from '../auth/session.guard';

class TenantDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @MinLength(2) @MaxLength(80) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
}
class UserDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MinLength(12) @MaxLength(200) password?: string;
  @IsIn(['SYSTEM_ADMIN', 'TENANT_ADMIN', 'USER']) role!: MembershipRole;
  @IsOptional() @IsUUID() organizationId?: string;
}
class SwitchTenantDto { @IsUUID() organizationId!: string; }
class ModuleToggleDto { @IsBoolean() enabled!: boolean; }
type CookieResponse = { setHeader(name: string, value: string): void };

@Controller('administration')
@UseGuards(SessionGuard, RolesGuard)
export class AdministrationController {
  constructor(private readonly db: PrismaService, private readonly auth: AuthService) {}

  @Get('context')
  @Roles('SYSTEM_ADMIN', 'TENANT_ADMIN', 'USER')
  async context(@Req() request: AuthenticatedRequest) {
    const isSystemAdmin = request.identity.role === 'SYSTEM_ADMIN';
    const [organization, users, tenants, modules, globalUsers] = await Promise.all([
      this.db.organization.findUnique({ where: { id: request.identity.organizationId }, select: { id: true, name: true, slug: true } }),
      request.identity.role !== 'USER' ? this.db.membership.findMany({ where: { organizationId: request.identity.organizationId }, orderBy: { createdAt: 'asc' }, select: { id: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } } }) : Promise.resolve([]),
      isSystemAdmin ? this.db.organization.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true, _count: { select: { memberships: true, contacts: true } }, modules: { select: { enabled: true, module: { select: { key: true } } } } } }) : Promise.resolve([]),
      isSystemAdmin ? this.db.systemModule.findMany({ orderBy: { createdAt: 'asc' }, include: { organizations: { select: { organizationId: true, enabled: true } } } }) : this.db.organizationModule.findMany({ where: { organizationId: request.identity.organizationId }, select: { enabled: true, module: { select: { key: true, name: true, description: true, active: true } } } }),
      isSystemAdmin ? this.db.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, memberships: { select: { role: true, organization: { select: { id: true, name: true } } } } } }) : Promise.resolve([]),
    ]);
    return {
      organization, users, tenants, modules, globalUsers, role: request.identity.role,
      settings: isSystemAdmin ? {
        leadProvider: 'OpenStreetMap / Nominatim / Overpass',
        whatsappProvider: 'WPPConnect Server',
        whatsappConfigured: true,
        nominatimUrl: process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org',
        overpassUrl: process.env.OVERPASS_URL ?? 'https://overpass.kumi.systems/api/interpreter',
      } : undefined,
    };
  }

  @Post('tenants')
  @Roles('SYSTEM_ADMIN')
  async createTenant(@Req() request: AuthenticatedRequest, @Body() dto: TenantDto) {
    const slug = dto.slug.toLowerCase();
    if (await this.db.organization.findUnique({ where: { slug } })) throw new ConflictException('Já existe uma empresa com este identificador');
    const modules = await this.db.systemModule.findMany({ select: { id: true } });
    return this.db.organization.create({ data: {
      name: dto.name.trim(), slug,
      memberships: { create: { userId: request.identity.userId, role: 'SYSTEM_ADMIN' } },
      modules: { create: modules.map((module) => ({ moduleId: module.id, enabled: false })) },
    }, select: { id: true, name: true, slug: true } });
  }

  @Post('switch-tenant')
  @HttpCode(200)
  @Roles('SYSTEM_ADMIN')
  async switchTenant(@Req() request: AuthenticatedRequest, @Body() dto: SwitchTenantDto, @Res({ passthrough: true }) response: CookieResponse) {
    const identity = await this.auth.switchOrganization(request.identity, dto.organizationId);
    response.setHeader('Set-Cookie', this.auth.sessionCookie(identity));
    return { ok: true };
  }

  @Post('users')
  @Roles('SYSTEM_ADMIN', 'TENANT_ADMIN')
  async createUser(@Req() request: AuthenticatedRequest, @Body() dto: UserDto) {
    if (request.identity.role !== 'SYSTEM_ADMIN' && dto.role === 'SYSTEM_ADMIN') throw new ConflictException('Somente o administrador do sistema pode criar este perfil');
    const organizationId = request.identity.role === 'SYSTEM_ADMIN' && dto.organizationId ? dto.organizationId : request.identity.organizationId;
    if (!await this.db.organization.findUnique({ where: { id: organizationId }, select: { id: true } })) throw new ConflictException('Empresa não encontrada');

    const email = dto.email.toLowerCase().trim();
    const existing = await this.db.user.findUnique({ where: { email }, include: { memberships: true } });
    if (existing) {
      if (existing.memberships.some((membership) => membership.organizationId === organizationId)) throw new ConflictException('Este usuário já está vinculado a esta empresa');
      await this.db.membership.create({ data: { userId: existing.id, organizationId, role: dto.role } });
      return this.db.user.findUnique({ where: { id: existing.id }, select: { id: true, name: true, email: true, memberships: { select: { role: true, organizationId: true } } } });
    }
    if (!dto.password) throw new ConflictException('Informe uma senha inicial para o novo usuário');
    return this.db.user.create({ data: { name: dto.name.trim(), email, passwordHash: await this.auth.hash(dto.password), memberships: { create: { organizationId, role: dto.role } } }, select: { id: true, name: true, email: true, memberships: { select: { role: true, organizationId: true } } } });
  }

  @Patch('tenants/:organizationId/modules/:moduleKey')
  @Roles('SYSTEM_ADMIN')
  async toggleModule(@Param('organizationId') organizationId: string, @Param('moduleKey') rawModuleKey: string, @Body() dto: ModuleToggleDto) {
    const moduleKey = rawModuleKey.toUpperCase() as ModuleKey;
    if (!['LEADS', 'WHATSAPP', 'EMAIL'].includes(moduleKey)) throw new ConflictException('Módulo inválido');
    const module = await this.db.systemModule.findUnique({ where: { key: moduleKey }, select: { id: true } });
    if (!module) throw new ConflictException('Módulo não encontrado');
    return this.db.organizationModule.upsert({
      where: { organizationId_moduleId: { organizationId, moduleId: module.id } },
      create: { organizationId, moduleId: module.id, enabled: dto.enabled }, update: { enabled: dto.enabled },
      select: { id: true, enabled: true, organizationId: true, module: { select: { key: true } } },
    });
  }
}

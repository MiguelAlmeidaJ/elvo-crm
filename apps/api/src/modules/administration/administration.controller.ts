import { Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
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
  @IsOptional() @IsString() @MaxLength(160) legalName?: string;
  @IsOptional() @IsString() @MaxLength(20) document?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) website?: string;
  @IsOptional() @IsString() @MaxLength(12) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(20) addressNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) complement?: string;
  @IsOptional() @IsString() @MaxLength(120) neighborhood?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(2) state?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(120) industry?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
class TenantStatusDto {
  @IsBoolean() active!: boolean;
  @IsString() confirmationName!: string;
}
class UserDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MinLength(12) @MaxLength(200) password?: string;
  @IsIn(['SYSTEM_ADMIN', 'TENANT_ADMIN', 'USER']) role!: MembershipRole;
  @IsOptional() @IsUUID() organizationId?: string;
}
class EditUserDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MinLength(12) @MaxLength(200) password?: string;
}
class UserStatusDto { @IsBoolean() active!: boolean; }
class MembershipDto {
  @IsUUID() organizationId!: string;
  @IsIn(['SYSTEM_ADMIN','TENANT_ADMIN','USER']) role!: MembershipRole;
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
      isSystemAdmin ? this.db.organization.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true, active: true, email: true, document: true, city: true, state: true, industry: true, _count: { select: { memberships: true, contacts: true } }, modules: { select: { enabled: true, module: { select: { key: true } } } } } }) : Promise.resolve([]),
      isSystemAdmin ? this.db.systemModule.findMany({ orderBy: { createdAt: 'asc' }, include: { organizations: { select: { organizationId: true, enabled: true } } } }) : this.db.organizationModule.findMany({ where: { organizationId: request.identity.organizationId }, select: { enabled: true, module: { select: { key: true, name: true, description: true, active: true } } } }),
      isSystemAdmin ? this.db.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, active: true, memberships: { select: { role: true, organization: { select: { id: true, name: true } } } } } }) : Promise.resolve([]),
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
      name: dto.name.trim(), slug, ...this.tenantDetails(dto),
      memberships: { create: { userId: request.identity.userId, role: 'SYSTEM_ADMIN' } },
      modules: { create: modules.map((module) => ({ moduleId: module.id, enabled: false })) },
    }, select: { id: true, name: true, slug: true } });
  }

  private tenantDetails(dto: TenantDto) {
    const fields = ['legalName', 'document', 'email', 'phone', 'website', 'postalCode', 'address', 'addressNumber', 'complement', 'neighborhood', 'city', 'state', 'country', 'industry', 'notes'] as const;
    const details: Record<string, string | null> = {};
    for (const field of fields) {
      if (dto[field] !== undefined) details[field] = dto[field]?.trim() || null;
    }
    return details;
  }

  @Get('tenants/:id')
  @Roles('SYSTEM_ADMIN')
  async getTenant(@Param('id') id: string) {
    const tenant = await this.db.organization.findUnique({
      where: { id }, include: { _count: { select: { memberships: true, contacts: true } } },
    });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');
    return tenant;
  }

  @Patch('tenants/:id')
  @Roles('SYSTEM_ADMIN')
  async updateTenant(@Param('id') id: string, @Body() dto: TenantDto) {
    const tenant = await this.db.organization.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');
    const slug = dto.slug.toLowerCase();
    if (tenant.slug !== slug && await this.db.organization.findUnique({ where: { slug } })) throw new ConflictException('Identificador já utilizado');
    return this.db.organization.update({ where: { id }, data: { name: dto.name.trim(), slug, ...this.tenantDetails(dto) } });
  }

  @Patch('tenants/:id/status')
  @Roles('SYSTEM_ADMIN')
  async changeTenantStatus(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: TenantStatusDto) {
    const tenant = await this.db.organization.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Empresa não encontrada');
    if (dto.confirmationName !== tenant.name) throw new ConflictException('Digite exatamente o nome da empresa para confirmar');
    if (!dto.active && request.identity.organizationId === id) throw new ConflictException('Não é possível inativar a empresa da sessão atual. Troque de empresa antes.');
    return this.db.organization.update({ where: { id }, data: { active: dto.active, deactivatedAt: dto.active ? null : new Date() } });
  }

  @Post('switch-tenant')
  @HttpCode(200)
  @Roles('SYSTEM_ADMIN')
  async switchTenant(@Req() request: AuthenticatedRequest, @Body() dto: SwitchTenantDto, @Res({ passthrough: true }) response: CookieResponse) {
    const target = await this.db.organization.findUnique({ where: { id: dto.organizationId }, select: { active: true } });
    if (!target?.active) throw new ConflictException('Empresa inativa. Reative-a antes de acessar.');
    const identity = await this.auth.switchOrganization(request.identity, dto.organizationId);
    response.setHeader('Set-Cookie', this.auth.sessionCookie(identity));
    return { ok: true };
  }

  @Post('users')
  @Roles('SYSTEM_ADMIN', 'TENANT_ADMIN')
  async createUser(@Req() request: AuthenticatedRequest, @Body() dto: UserDto) {
    if (request.identity.role !== 'SYSTEM_ADMIN' && dto.role === 'SYSTEM_ADMIN') throw new ConflictException('Somente o administrador do sistema pode criar este perfil');
    const organizationId = request.identity.role === 'SYSTEM_ADMIN' && dto.organizationId ? dto.organizationId : request.identity.organizationId;
    if (!await this.db.organization.findFirst({ where: { id: organizationId, active: true }, select: { id: true } })) throw new ConflictException('Empresa não encontrada ou inativa');

    const email = dto.email.toLowerCase().trim();
    const existing = await this.db.user.findUnique({ where: { email }, include: { memberships: true } });
    if (existing) {
      if (!existing.active) throw new ConflictException('Usuário inativo; reative antes de vincular');
      if (existing.memberships.some((membership) => membership.organizationId === organizationId)) throw new ConflictException('Este usuário já está vinculado a esta empresa');
      await this.db.membership.create({ data: { userId: existing.id, organizationId, role: dto.role } });
      return this.db.user.findUnique({ where: { id: existing.id }, select: { id: true, name: true, email: true, memberships: { select: { role: true, organizationId: true } } } });
    }
    if (!dto.password) throw new ConflictException('Informe uma senha inicial para o novo usuário');
    return this.db.user.create({ data: { name: dto.name.trim(), email, passwordHash: await this.auth.hash(dto.password), memberships: { create: { organizationId, role: dto.role } } }, select: { id: true, name: true, email: true, memberships: { select: { role: true, organizationId: true } } } });
  }

  @Get('users/:id')
  @Roles('SYSTEM_ADMIN')
  async getUser(@Param('id') id: string) {
    const user = await this.db.user.findUnique({ where: { id }, select: {
      id: true, name: true, email: true, active: true,
      memberships: { select: { organizationId: true, role: true, organization: { select: { name: true, active: true } } } },
    } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  @Patch('users/:id')
  @Roles('SYSTEM_ADMIN')
  async editUser(@Param('id') id: string, @Body() dto: EditUserDto) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const email = dto.email.trim().toLowerCase();
    if (email !== user.email && await this.db.user.findUnique({ where: { email } })) throw new ConflictException('E-mail já utilizado');
    return this.db.user.update({ where: { id }, data: { name: dto.name.trim(), email, ...(dto.password ? { passwordHash: await this.auth.hash(dto.password) } : {}) }, select: { id: true, name: true, email: true, active: true } });
  }

  @Patch('users/:id/status')
  @Roles('SYSTEM_ADMIN')
  async userStatus(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UserStatusDto) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!dto.active && id === request.identity.userId) throw new ConflictException('Não é possível inativar seu próprio usuário');
    return this.db.user.update({ where: { id }, data: { active: dto.active, deactivatedAt: dto.active ? null : new Date() }, select: { id: true, active: true } });
  }

  @Post('users/:id/memberships')
  @Roles('SYSTEM_ADMIN')
  async linkUser(@Param('id') id: string, @Body() dto: MembershipDto) {
    const [user, org] = await Promise.all([
      this.db.user.findUnique({ where: { id }, select: { active: true } }),
      this.db.organization.findUnique({ where: { id: dto.organizationId }, select: { active: true } }),
    ]);
    if (!user?.active || !org?.active) throw new ConflictException('Usuário ou empresa inexistente/inativo');
    return this.db.membership.upsert({
      where: { organizationId_userId: { organizationId: dto.organizationId, userId: id } },
      create: { organizationId: dto.organizationId, userId: id, role: dto.role },
      update: { role: dto.role },
    });
  }

  @Patch('tenants/:organizationId/modules/:moduleKey')
  @Roles('SYSTEM_ADMIN')
  async toggleModule(@Param('organizationId') organizationId: string, @Param('moduleKey') rawModuleKey: string, @Body() dto: ModuleToggleDto) {
    const moduleKey = rawModuleKey.toUpperCase() as ModuleKey;
    if (!['LEADS', 'WHATSAPP', 'EMAIL'].includes(moduleKey)) throw new ConflictException('Módulo inválido');
    const organization = await this.db.organization.findUnique({ where: { id: organizationId }, select: { active: true } });
    if (!organization?.active) throw new ConflictException('Empresa inexistente ou inativa');
    const module = await this.db.systemModule.findUnique({ where: { key: moduleKey }, select: { id: true, active: true } });
    if (!module?.active && dto.enabled) throw new ConflictException('Módulo indisponível');
    if (!module) throw new ConflictException('Módulo não encontrado');
    return this.db.organizationModule.upsert({
      where: { organizationId_moduleId: { organizationId, moduleId: module.id } },
      create: { organizationId, moduleId: module.id, enabled: dto.enabled }, update: { enabled: dto.enabled },
      select: { id: true, enabled: true, organizationId: true, module: { select: { key: true } } },
    });
  }
}

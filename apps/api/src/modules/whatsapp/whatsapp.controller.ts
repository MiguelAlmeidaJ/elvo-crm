import { BadGatewayException, Body, Controller, Get, HttpCode, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { RequireModule } from '../auth/module.decorator';
import { ModuleGuard } from '../auth/module.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionGuard } from '../auth/session.guard';

class InstanceDto { @IsString() @MinLength(3) @MaxLength(50) @Matches(/^[a-z0-9-]+$/) instanceName!: string; }
class SendTextDto {
  @IsString() @Matches(/^\d{10,15}$/) number!: string;
  @IsString() @MinLength(1) @MaxLength(4096) text!: string;
}
type ModuleConfig = { instanceName?: string; token?: string };
type TokenResponse = { token?: string; full?: string; status?: string };

@Controller('whatsapp')
@UseGuards(SessionGuard, ModuleGuard, RolesGuard)
@RequireModule('WHATSAPP')
export class WhatsappController {
  constructor(private readonly db: PrismaService) {}

  private credentials() {
    const baseUrl = (process.env.WPP_CONNECT_URL ?? 'http://127.0.0.1:21465').replace(/\/+$/, '');
    const secret = process.env.WPP_SECRET_KEY ?? 'elvo-local-wppconnect-secret-change-before-production';
    return { baseUrl, secret };
  }

  private async call(path: string, init?: RequestInit, token?: string) {
    const { baseUrl } = this.credentials();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null);
    if (!response) throw new BadGatewayException('O WPPConnect Server não respondeu. Confirme se o container está ativo.');
    const text = await response.text();
    let payload: unknown = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
    if (!response.ok) throw new BadGatewayException({ message: 'O WPPConnect rejeitou a solicitação', status: response.status, detail: payload });
    return payload;
  }

  private async module(organizationId: string) {
    const access = await this.db.organizationModule.findFirst({ where: { organizationId, module: { key: 'WHATSAPP' } }, include: { module: true } });
    if (!access) throw new ServiceUnavailableException('Módulo WhatsApp não configurado para esta empresa');
    return access;
  }

  private async session(organizationId: string) {
    const access = await this.module(organizationId);
    const config = (access.config ?? {}) as ModuleConfig;
    if (!config.instanceName || !config.token) throw new ServiceUnavailableException('Crie uma sessão do WhatsApp para esta empresa');
    return { name: config.instanceName, token: config.token };
  }

  @Get('status')
  async status(@Req() request: AuthenticatedRequest) {
    const access = await this.module(request.identity.organizationId);
    const config = (access.config ?? {}) as ModuleConfig;
    if (!config.instanceName || !config.token) return { configured: false, state: 'not_created', provider: 'WPPConnect' };
    const payload = await this.call(`/api/${encodeURIComponent(config.instanceName)}/check-connection-session`, undefined, config.token);
    return { configured: true, instanceName: config.instanceName, provider: 'WPPConnect', payload };
  }

  @Post('instance')
  @Roles('SYSTEM_ADMIN', 'TENANT_ADMIN')
  async createInstance(@Req() request: AuthenticatedRequest, @Body() dto: InstanceDto) {
    const access = await this.module(request.identity.organizationId);
    const { secret } = this.credentials();
    const tokenPayload = await this.call(`/api/${encodeURIComponent(dto.instanceName)}/${encodeURIComponent(secret)}/generate-token`, { method: 'POST' }) as TokenResponse;
    const token = tokenPayload.token ?? tokenPayload.full?.replace(/^wppconnect:/, '');
    if (!token) throw new BadGatewayException('O WPPConnect não retornou o token da sessão');
    const payload = await this.call(`/api/${encodeURIComponent(dto.instanceName)}/start-session`, { method: 'POST', body: JSON.stringify({ webhook: '', waitQrCode: true }) }, token);
    await this.db.organizationModule.update({ where: { id: access.id }, data: { config: { instanceName: dto.instanceName, token } } });
    return { instanceName: dto.instanceName, provider: 'WPPConnect', payload };
  }

  @Get('qrcode')
  @Roles('SYSTEM_ADMIN', 'TENANT_ADMIN')
  async qrcode(@Req() request: AuthenticatedRequest) {
    const session = await this.session(request.identity.organizationId);
    return this.call(`/api/${encodeURIComponent(session.name)}/qrcode-session`, undefined, session.token);
  }

  @Post('send-text')
  @HttpCode(200)
  async sendText(@Req() request: AuthenticatedRequest, @Body() dto: SendTextDto) {
    const session = await this.session(request.identity.organizationId);
    return this.call(`/api/${encodeURIComponent(session.name)}/send-message`, {
      method: 'POST', body: JSON.stringify({ phone: dto.number, isGroup: false, isNewsletter: false, isLid: false, message: dto.text }),
    }, session.token);
  }

  @Post('logout')
  @HttpCode(200)
  @Roles('SYSTEM_ADMIN', 'TENANT_ADMIN')
  async logout(@Req() request: AuthenticatedRequest) {
    const session = await this.session(request.identity.organizationId);
    return this.call(`/api/${encodeURIComponent(session.name)}/logout-session`, { method: 'POST' }, session.token);
  }
}

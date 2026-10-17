import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import { SessionGuard } from '../auth/session.guard';

class TaskCreate {
  @IsString() @MinLength(2) @MaxLength(200) title!: string;
  @IsOptional() @IsUUID() contactId?: string;
  @IsOptional() @IsISO8601() dueAt?: string;
}
class TaskPatch {
  @IsOptional() @IsBoolean() done?: boolean;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
}
class ActivityCreate {
  @IsUUID() contactId!: string;
  @IsIn(['NOTE','CALL','MEETING','EMAIL']) type!: string;
  @IsString() @MinLength(2) @MaxLength(3000) description!: string;
}
class ProposalCreate {
  @IsUUID() opportunityId!: string;
  @IsString() @MinLength(2) @MaxLength(200) title!: string;
  @IsString() amount!: string;
}
class ProposalPatch {
  @IsOptional() @IsIn(['DRAFT','SENT','ACCEPTED','REJECTED']) status?: string;
}
@Controller()
@UseGuards(SessionGuard)
export class WorkflowController {
  constructor(private readonly db: PrismaService) {}
  private money(v: string) {
    if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(v)) throw new BadRequestException('Valor monetário inválido');
    return v;
  }
  private async contact(id: string, org: string) {
    if (!(await this.db.contact.findFirst({ where: { id, organizationId: org }, select: { id: true } }))) throw new BadRequestException('Cliente inválido');
  }
  @Get('tasks') tasks(@Req() req: any) {
    return this.db.task.findMany({ where: { organizationId: req.identity.organizationId }, orderBy: { createdAt: 'desc' }, take: 300, include: { contact: { select: { id: true, name: true } } } });
  }
  @Post('tasks') async createTask(@Req() req: any, @Body() dto: TaskCreate) {
    const org = req.identity.organizationId;
    if (dto.contactId) await this.contact(dto.contactId, org);
    return this.db.task.create({ data: { organizationId: org, title: dto.title, contactId: dto.contactId, dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined } });
  }
  @Patch('tasks/:id') async patchTask(@Req() req: any, @Param('id') id: string, @Body() dto: TaskPatch) {
    const organizationId = req.identity.organizationId;
    const result = await this.db.task.updateMany({ where: { id, organizationId }, data: dto });
    if (!result.count) throw new NotFoundException();
    return this.db.task.findFirst({ where: { id, organizationId } });
  }
  @Delete('tasks/:id') async deleteTask(@Req() req: any, @Param('id') id: string) {
    const result = await this.db.task.deleteMany({ where: { id, organizationId: req.identity.organizationId } });
    if (!result.count) throw new NotFoundException();
    return { ok: true };
  }
  @Get('activities') activities(@Req() req: any, @Query('contactId') contactId?: string) {
    if (!contactId) throw new BadRequestException('contactId obrigatório');
    return this.db.activity.findMany({ where: { organizationId: req.identity.organizationId, contactId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  @Post('activities') async activity(@Req() req: any, @Body() dto: ActivityCreate) {
    const organizationId = req.identity.organizationId;
    await this.contact(dto.contactId, organizationId);
    return this.db.activity.create({ data: { organizationId, ...dto } });
  }
  @Get('proposals') proposals(@Req() req: any) {
    return this.db.proposal.findMany({ where: { organizationId: req.identity.organizationId }, include: { opportunity: { select: { title: true, contact: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 300 });
  }
  @Post('proposals') async proposal(@Req() req: any, @Body() dto: ProposalCreate) {
    const organizationId = req.identity.organizationId;
    const deal = await this.db.opportunity.findFirst({ where: { id: dto.opportunityId, organizationId }, select: { id: true } });
    if (!deal) throw new BadRequestException('Oportunidade inválida');
    return this.db.proposal.create({ data: { organizationId, opportunityId: deal.id, title: dto.title, amount: this.money(dto.amount) } });
  }
  @Patch('proposals/:id') async patchProposal(@Req() req: any, @Param('id') id: string, @Body() dto: ProposalPatch) {
    const organizationId = req.identity.organizationId;
    const updated = await this.db.proposal.updateMany({ where: { id, organizationId }, data: dto });
    if (!updated.count) throw new NotFoundException();
    return this.db.proposal.findFirst({ where: { id, organizationId } });
  }
}

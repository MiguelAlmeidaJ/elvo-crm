import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import { SessionGuard } from '../auth/session.guard';
import { OpportunityStage } from '@prisma/client';

const stages = ['QUALIFICATION','PROPOSAL','NEGOTIATION','WON','LOST'];
class CreateOpportunityDto {
  @IsString() @MinLength(2) @MaxLength(150) title!: string;
  @IsUUID() contactId!: string;
  @IsString() amount!: string;
  @IsOptional() @IsIn(stages) stage?: OpportunityStage;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}
class UpdateOpportunityDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) title?: string;
  @IsOptional() @IsString() amount?: string;
  @IsOptional() @IsIn(stages) stage?: OpportunityStage;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}
@Controller('opportunities')
@UseGuards(SessionGuard)
export class OpportunitiesController {
  constructor(private readonly db: PrismaService) {}
  private money(raw: string) {
    if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(raw)) throw new BadRequestException('Valor inválido; use 1234.56');
    return raw;
  }
  @Get()
  list(@Req() req: any) {
    return this.db.opportunity.findMany({
      where: { organizationId: req.identity.organizationId },
      include: { contact: { select: { id: true, name: true, company: true } } },
      orderBy: { updatedAt: 'desc' }, take: 500
    });
  }
  @Post()
  async create(@Req() req: any, @Body() dto: CreateOpportunityDto) {
    const organizationId = req.identity.organizationId;
    const contact = await this.db.contact.findFirst({ where: { id: dto.contactId, organizationId }, select: { id: true } });
    if (!contact) throw new BadRequestException('Cliente não pertence à organização');
    return this.db.opportunity.create({ data: { organizationId, contactId: contact.id, title: dto.title,
      amount: this.money(dto.amount), stage: dto.stage, notes: dto.notes } });
  }
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOpportunityDto) {
    const organizationId = req.identity.organizationId;
    const found = await this.db.opportunity.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!found) throw new NotFoundException();
    const result = await this.db.opportunity.updateMany({ where: { id, organizationId },
      data: { title: dto.title, amount: dto.amount === undefined ? undefined : this.money(dto.amount), stage: dto.stage, notes: dto.notes } });
    if (!result.count) throw new NotFoundException();
    return this.db.opportunity.findFirst({ where: { id, organizationId }, include: { contact: true } });
  }
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const result = await this.db.opportunity.deleteMany({ where: { id, organizationId: req.identity.organizationId } });
    if (!result.count) throw new NotFoundException();
    return { ok: true };
  }
}

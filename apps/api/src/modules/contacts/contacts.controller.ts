import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { IsArray, IsEmail, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';

class ContactDto {
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsOptional() @IsIn(['PERSON', 'COMPANY']) entityType?: string;
  @IsOptional() @IsString() @MaxLength(30) document?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(40) secondaryPhone?: string;
  @IsOptional() @IsString() @MaxLength(150) company?: string;
  @IsOptional() @IsString() @MaxLength(100) jobTitle?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500) website?: string;
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(80) state?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() @MaxLength(50) source?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsIn(['Ativo', 'Inativo', 'Prospect']) status?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}
class UpdateContactDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?: string;
  @IsOptional() @IsIn(['PERSON', 'COMPANY']) entityType?: string;
  @IsOptional() @IsString() @MaxLength(30) document?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(40) secondaryPhone?: string;
  @IsOptional() @IsString() @MaxLength(150) company?: string;
  @IsOptional() @IsString() @MaxLength(100) jobTitle?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500) website?: string;
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(80) state?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() @MaxLength(50) source?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsIn(['Ativo', 'Inativo', 'Prospect']) status?: string;
  @IsOptional() @IsString() @MaxLength(3000) notes?: string;
}
@Controller('contacts')
@UseGuards(SessionGuard)
export class ContactsController {
  constructor(private readonly db: PrismaService) {}
  @Get()
  async list(@Req() req: AuthenticatedRequest, @Query('q') q?: string, @Query('page') rawPage?: string) {
    const page = Number(rawPage ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000) throw new BadRequestException('Página inválida');
    const where = { organizationId: req.identity.organizationId,
      ...(q ? { OR: [{ name: { contains: q.slice(0,100), mode: 'insensitive' as const } },
                    { company: { contains: q.slice(0,100), mode: 'insensitive' as const } },
                    { email: { contains: q.slice(0,100), mode: 'insensitive' as const } },
                    { document: { contains: q.slice(0,100), mode: 'insensitive' as const } },
                    { phone: { contains: q.slice(0,100), mode: 'insensitive' as const } },
                    { city: { contains: q.slice(0,100), mode: 'insensitive' as const } }] } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.contact.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page-1)*20, take: 20 }),
      this.db.contact.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total/20) };
  }
  @Get(':id')
  async one(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const found = await this.db.contact.findFirst({ where: { id, organizationId: req.identity.organizationId } });
    if (!found) throw new NotFoundException('Cliente não encontrado');
    return found;
  }
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: ContactDto) {
    return this.db.contact.create({ data: { ...dto, organizationId: req.identity.organizationId } });
  }
  @Patch(':id')
  async update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    const result = await this.db.contact.updateMany({ where: { id, organizationId: req.identity.organizationId }, data: dto });
    if (!result.count) throw new NotFoundException('Cliente não encontrado');
    return this.one(req, id);
  }
  @Delete(':id')
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const result = await this.db.contact.deleteMany({ where: { id, organizationId: req.identity.organizationId } });
    if (!result.count) throw new NotFoundException('Cliente não encontrado');
    return { ok: true };
  }
}

import { BadGatewayException, Body, ConflictException, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { RequireModule } from '../auth/module.decorator';
import { ModuleGuard } from '../auth/module.guard';
import { SessionGuard } from '../auth/session.guard';

const geocodeCache = new Map<string, { expires: number; value: NominatimPlace | null }>();
let geocodeQueue: Promise<unknown> = Promise.resolve();
let lastGeocodeAt = 0;

class SearchLeadsDto {
  @IsString() @MinLength(2) @MaxLength(100) niche!: string;
  @IsString() @MinLength(2) @MaxLength(150) location!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) limit = 40;
}

class ImportLeadDto {
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsString() @MinLength(3) @MaxLength(255) externalId!: string;
  @IsOptional() @IsString() @MaxLength(250) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(80) state?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500) website?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(500) mapsUrl?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) types?: string[];
}

type NominatimPlace = { boundingbox: [string, string, string, string]; display_name: string };
type NominatimBusiness = {
  place_id: number; osm_id: number; osm_type: 'node' | 'way' | 'relation'; lat: string; lon: string;
  display_name: string; name?: string; type?: string; category?: string;
  address?: Record<string, string>; extratags?: Record<string, string>; namedetails?: Record<string, string>;
};
type OsmElement = { type: 'node' | 'way' | 'relation'; id: number; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string> };
type OverpassResponse = { elements?: OsmElement[]; remark?: string };

function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function escapeOverpass(value: string) { return value.replace(/[\\"\n\r]/g, (char) => `\\${char}`).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function categoryFilters(niche: string) {
  const value = normalize(niche);
  if (/clinic|medic|saude|dent|odont/.test(value)) return ['["amenity"~"clinic|doctors|dentist|hospital"]', '["healthcare"]'];
  if (/restaurante|lanch|pizz|comida|bar/.test(value)) return ['["amenity"~"restaurant|fast_food|cafe|bar|pub"]'];
  if (/advoc|jurid|contab|contador/.test(value)) return ['["office"~"lawyer|accountant|financial"]'];
  if (/academia|fitness|esport/.test(value)) return ['["leisure"~"fitness_centre|sports_centre"]'];
  if (/hotel|pousada|hosped/.test(value)) return ['["tourism"~"hotel|guest_house|hostel|motel"]'];
  if (/farmac/.test(value)) return ['["amenity"="pharmacy"]'];
  if (/mercado|supermercado|mercearia/.test(value)) return ['["shop"~"supermarket|convenience|grocery"]'];
  if (/imobili|corretor/.test(value)) return ['["office"="estate_agent"]'];
  if (/escola|colegio|educa/.test(value)) return ['["amenity"~"school|college|kindergarten|language_school"]'];
  if (/salao|beleza|barbear/.test(value)) return ['["shop"~"beauty|hairdresser"]'];
  return [];
}

function nominatimTerm(niche: string) {
  const value = normalize(niche);
  if (/clinic|medic|saude/.test(value)) return 'hospital';
  if (/dent|odont/.test(value)) return 'dentist';
  if (/advoc|jurid/.test(value)) return 'lawyer';
  if (/contab|contador/.test(value)) return 'accountant';
  if (/academia|fitness/.test(value)) return 'gym';
  if (/farmac/.test(value)) return 'pharmacy';
  if (/mercado|supermercado/.test(value)) return 'supermarket';
  if (/salao|beleza|barbear/.test(value)) return 'hairdresser';
  return niche.trim();
}

async function nominatimBusinesses(niche: string, location: string, limit: number) {
  const task = geocodeQueue.then(async () => {
    const wait = Math.max(0, 1_050 - (Date.now() - lastGeocodeAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastGeocodeAt = Date.now();
    const baseUrl = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
    const userAgent = process.env.LEAD_SEARCH_USER_AGENT ?? 'ELVO-CRM/1.0 (contato@localhost)';
    const params = new URLSearchParams({ q: `${nominatimTerm(niche)}, ${location}, Brasil`, format: 'jsonv2', limit: String(Math.min(limit, 50)), countrycodes: 'br', addressdetails: '1', extratags: '1', namedetails: '1' });
    const response = await fetch(`${baseUrl}/search?${params}`, { headers: { 'User-Agent': userAgent, 'Accept-Language': 'pt-BR' }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return [];
    return response.json() as Promise<NominatimBusiness[]>;
  });
  geocodeQueue = task.then(() => undefined, () => undefined);
  const places = await task.catch(() => []);
  return places.map((place) => {
    const address = place.address ?? {};
    const extra = place.extratags ?? {};
    const name = place.namedetails?.name ?? place.name ?? place.display_name.split(',')[0];
    return {
      externalId: `${place.osm_type}/${place.osm_id}`, name, address: place.display_name,
      city: address.city ?? address.town ?? address.municipality ?? address.village, state: address.state,
      postalCode: address.postcode, phone: extra['contact:phone'] ?? extra.phone ?? extra['contact:mobile'],
      email: extra['contact:email'] ?? extra.email, website: extra['contact:website'] ?? extra.website,
      mapsUrl: `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`,
      category: place.type ?? place.category, types: [place.type, place.category].filter((value): value is string => Boolean(value)),
      latitude: Number(place.lat), longitude: Number(place.lon), openingHours: extra.opening_hours ? [extra.opening_hours] : [],
    };
  });
}

async function geocode(location: string) {
  const key = normalize(location.trim());
  const cached = geocodeCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const task = geocodeQueue.then(async () => {
    const wait = Math.max(0, 1_050 - (Date.now() - lastGeocodeAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastGeocodeAt = Date.now();
    const params = new URLSearchParams({ q: `${location}, Brasil`, format: 'jsonv2', limit: '1', countrycodes: 'br' });
    const baseUrl = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
    const userAgent = process.env.LEAD_SEARCH_USER_AGENT ?? 'ELVO-CRM/1.0 (contato@localhost)';
    const response = await fetch(`${baseUrl}/search?${params}`, { headers: { 'User-Agent': userAgent, 'Accept-Language': 'pt-BR' }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new BadGatewayException('Não foi possível localizar a região informada');
    const result = (await response.json() as NominatimPlace[])[0] ?? null;
    geocodeCache.set(key, { value: result, expires: Date.now() + 86_400_000 });
    return result;
  });
  geocodeQueue = task.then(() => undefined, () => undefined);
  return task;
}

@Controller('leads')
@UseGuards(SessionGuard, ModuleGuard)
@RequireModule('LEADS')
export class LeadsController {
  constructor(private readonly db: PrismaService) {}

  @Get('search')
  async search(@Query() query: SearchLeadsDto) {
    const area = await geocode(query.location);
    if (!area) return { items: [], nextPageToken: null, provider: 'OpenStreetMap' };
    const [south, north, west, east] = area.boundingbox;
    const bbox = `${south},${west},${north},${east}`;
    const term = escapeOverpass(query.niche.trim());
    const selectors = [
      `["name"~"${term}",i]`, `["brand"~"${term}",i]`, `["operator"~"${term}",i]`,
      `["description"~"${term}",i]`, ...categoryFilters(query.niche),
    ];
    const overpassQuery = `[out:json][timeout:20];(${selectors.map((selector) => `nwr${selector}(${bbox});`).join('')});out center tags ${query.limit};`;
    const userAgent = process.env.LEAD_SEARCH_USER_AGENT ?? 'ELVO-CRM/1.0 (contato@localhost)';
    const endpoints = [...new Set([
      process.env.OVERPASS_URL,
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass-api.de/api/interpreter',
    ].filter((value): value is string => Boolean(value)))];
    let response: Response | null = null;
    for (const endpoint of endpoints) {
      const candidate = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': userAgent },
        body: new URLSearchParams({ data: overpassQuery }), signal: AbortSignal.timeout(6_000),
      }).catch(() => null);
      if (candidate?.ok) { response = candidate; break; }
      if (candidate && candidate.status < 500 && candidate.status !== 429) { response = candidate; break; }
    }
    if (!response) return { items: await nominatimBusinesses(query.niche, query.location, query.limit), nextPageToken: null, provider: 'OpenStreetMap', attributionUrl: 'https://www.openstreetmap.org/copyright' };
    if (!response.ok) throw new BadGatewayException(response.status === 429 ? 'O serviço gratuito está ocupado. Aguarde alguns segundos e tente novamente.' : 'Não foi possível consultar a base aberta de empresas');
    const payload = await response.json() as OverpassResponse;

    return {
      items: (payload.elements ?? []).flatMap((element) => {
        const tags = element.tags ?? {};
        const name = tags.name ?? tags.brand ?? tags.operator;
        if (!name) return [];
        const latitude = element.lat ?? element.center?.lat;
        const longitude = element.lon ?? element.center?.lon;
        const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ');
        const category = tags.healthcare ?? tags.amenity ?? tags.shop ?? tags.office ?? tags.craft ?? tags.tourism ?? tags.leisure;
        return [{
          externalId: `${element.type}/${element.id}`, name, address: street || undefined,
          city: tags['addr:city'] ?? tags['addr:municipality'] ?? query.location, state: tags['addr:state'], postalCode: tags['addr:postcode'],
          phone: tags['contact:phone'] ?? tags.phone ?? tags['contact:mobile'], email: tags['contact:email'] ?? tags.email,
          website: tags['contact:website'] ?? tags.website, mapsUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
          category, types: [category, tags.cuisine, tags.speciality].filter((value): value is string => Boolean(value)),
          latitude, longitude, openingHours: tags.opening_hours ? [tags.opening_hours] : [],
        }];
      }),
      nextPageToken: null,
      provider: 'OpenStreetMap',
      attributionUrl: 'https://www.openstreetmap.org/copyright',
    };
  }

  @Post('import')
  async import(@Req() request: AuthenticatedRequest, @Body() lead: ImportLeadDto) {
    const existing = await this.db.contact.findFirst({ where: { organizationId: request.identity.organizationId, externalProvider: 'OPENSTREETMAP', externalId: lead.externalId }, select: { id: true, name: true } });
    if (existing) throw new ConflictException({ message: 'Este lead já foi importado', contact: existing });
    return this.db.contact.create({ data: {
      organizationId: request.identity.organizationId, name: lead.name, company: lead.name, entityType: 'COMPANY',
      phone: lead.phone, email: lead.email, website: lead.website, address: lead.address, city: lead.city, state: lead.state,
      postalCode: lead.postalCode, category: lead.category, source: 'LEAD_SEARCH', status: 'Prospect', tags: lead.types?.slice(0, 12) ?? [],
      externalProvider: 'OPENSTREETMAP', externalId: lead.externalId, latitude: lead.latitude, longitude: lead.longitude,
      notes: lead.mapsUrl ? `Origem: ${lead.mapsUrl}` : undefined,
    } });
  }
}

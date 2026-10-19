/* global console, process */
import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const validRoles = new Set(['SYSTEM_ADMIN', 'TENANT_ADMIN', 'USER']);

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '../../.env'));
const prisma = new PrismaClient();

function readArguments(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (!argument.startsWith('--')) throw new Error(`Argumento inválido: ${argument}`);
    const [rawKey, inlineValue] = argument.slice(2).split('=', 2);
    const key = rawKey === 'org' ? 'organization' : rawKey;
    const value = inlineValue ?? values[++index];
    if (!value || value.startsWith('--')) throw new Error(`Informe um valor para --${rawKey}`);
    parsed[key] = value;
  }
  return parsed;
}

function printUsage() {
  console.log(`
Cria um usuário ou vincula um e-mail existente a outra organização.

Uso:
  pnpm user:create -- --name "Nome" --email usuario@empresa.com --org slug-da-org --role USER

Senha (necessária somente para um e-mail novo):
  Defina CREATE_USER_PASSWORD no ambiente ou use --password com 12+ caracteres.

Papéis disponíveis: SYSTEM_ADMIN, TENANT_ADMIN, USER (padrão: USER)
Para consultar organizações: pnpm user:create -- --list-orgs
`);
}

async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { printUsage(); return; }
  if (args.includes('--list-orgs')) {
    const organizations = await prisma.organization.findMany({ select: { name: true, slug: true }, orderBy: { name: 'asc' } });
    if (!organizations.length) console.log('Nenhuma organização cadastrada. Execute o bootstrap inicial primeiro.');
    else console.table(organizations);
    return;
  }

  const input = readArguments(args);
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const organization = input.organization?.trim();
  const role = (input.role ?? 'USER').trim().toUpperCase();
  const password = input.password ?? process.env.CREATE_USER_PASSWORD;
  const missing = [!name && '--name', !email && '--email', !organization && '--org'].filter(Boolean);
  if (missing.length) throw new Error(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (!validRoles.has(role)) throw new Error(`Papel inválido: ${role}. Use SYSTEM_ADMIN, TENANT_ADMIN ou USER.`);

  const org = await prisma.organization.findFirst({ where: { OR: [{ slug: organization }, { id: organization }] }, select: { id: true, name: true, slug: true } });
  if (!org) throw new Error(`Organização "${organization}" não encontrada. Use --list-orgs para consultar as opções.`);

  const existing = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });
  if (existing) {
    if (existing.memberships.some((membership) => membership.organizationId === org.id)) throw new Error(`O usuário ${email} já está vinculado à organização ${org.name}.`);
    await prisma.membership.create({ data: { userId: existing.id, organizationId: org.id, role } });
    console.log(`Usuário existente vinculado com sucesso: ${existing.name} <${existing.email}>`);
    console.log(`Organização: ${org.name} (${org.slug}) | Papel: ${role}`);
    return;
  }

  if (!password) throw new Error('Defina CREATE_USER_PASSWORD ou use --password para criar um novo usuário.');
  if (password.length < 12) throw new Error('A senha deve conter pelo menos 12 caracteres.');
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await passwordHash(password), memberships: { create: { organizationId: org.id, role } } },
    select: { id: true, name: true, email: true },
  });
  console.log(`Usuário criado com sucesso: ${user.name} <${user.email}>`);
  console.log(`Organização: ${org.name} (${org.slug}) | Papel: ${role}`);
}

main().catch((error) => {
  console.error(`Erro: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());

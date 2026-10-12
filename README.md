# ELVO CRM

Monorepo TypeScript do ELVO CRM, produto da ANOAR, preparado para evolução multi-tenant.

## Stack
- **Web:** Next.js 15 (App Router), React 19, Tailwind CSS 3, SCSS e React Icons
- **API:** NestJS 11, Prisma ORM 6, PostgreSQL
- **Infra:** Docker Compose para PostgreSQL; PM2 para Web/API
- **Gerenciador:** pnpm workspaces

## Pré-requisitos
Node.js >= 20, pnpm 10 e Docker com Compose.

## Desenvolvimento
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
pnpm install
docker compose up -d
pnpm --filter @elvo/api prisma:generate
pnpm --filter @elvo/api prisma:migrate
pnpm dev
```

Web: http://localhost:3000 · API: http://localhost:3001/api/v1 · Health: http://localhost:3001/api/v1/health

> O arquivo `apps/api/.env` configura a conexão usada pelo Prisma CLI e pela API. Em produção, injete os segredos pelo ambiente; nunca os versionar.

## Build e PM2
```bash
pnpm build
pm2 start ecosystem.config.cjs
```

O PM2 inicia aplicações já compiladas. O PostgreSQL continua no Docker. Use Nginx como proxy reverso e HTTPS no servidor.

## Próximas etapas
Autenticação, memberships e isolamento por organização, permissões, auditoria e módulos de CRM. **Não existe autenticação ou isolamento de tenants implementado nesta fundação**; não exponha operações de dados de clientes até essas camadas estarem prontas.

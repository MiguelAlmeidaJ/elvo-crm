# ELVO CRM

Monorepo TypeScript do ELVO CRM, produto da ANOAR.

## Stack
Next.js 15 / React 19, NestJS 11, Prisma 6, PostgreSQL, pnpm workspace, Docker Compose e PM2.

## Inicialização local
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
# Preencha SESSION_SECRET (>=32 caracteres aleatórios) e SETUP_KEY com valores secretos exclusivos.
pnpm install
docker compose up -d
pnpm --filter @elvo/api prisma:generate
pnpm --filter @elvo/api prisma:deploy
pnpm dev
```
Web: http://localhost:3000 · API: http://localhost:3001/api/v1 · Health: http://localhost:3001/api/v1/health

## Primeiro usuário e organização
A criação inicial é permitida apenas uma vez e exige `SETUP_KEY`. Exemplo:

```bash
curl -X POST http://localhost:3000/api/v1/auth/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"key":"SUA_SETUP_KEY","name":"Administrador","email":"admin@exemplo.com","password":"SENHA_FORTE_COM_12_OU_MAIS","organization":"ANOAR"}'
```
Depois, faça login em `/login`. Remova `SETUP_KEY` da configuração após a criação do administrador e reinicie a API. Não exponha a chave em repositórios ou logs.

## Deploy existente com PM2
Configure `SESSION_SECRET` e `WEB_ORIGIN` na API; configure `API_INTERNAL_URL` na Web caso a API não esteja disponível em `http://127.0.0.1:3001`.
```bash
pnpm install --frozen-lockfile
pnpm --filter @elvo/api prisma:generate
pnpm --filter @elvo/api prisma:deploy
pnpm build
pm2 restart ecosystem.config.cjs --update-env
```
O PostgreSQL continua no Docker. Use Nginx com HTTPS. A aplicação Web faz proxy das solicitações `/api/v1/*` para a API para manter o cookie HttpOnly na mesma origem.

## Escopo implementado
Login, sessão assinada HttpOnly e SameSite=Lax, bootstrap inicial, CRUD de clientes com validação, filtro e paginação, isolamento por organização derivada da sessão. Ainda faltam fluxo de convite de usuários, recuperação de senha, revogação de sessões, auditoria, permissões granulares, demais módulos do CRM e testes automatizados. Não há auto cadastro público.

Importante: antes de produção pública, adicione proteção contra força bruta no login/bootstrap, gestão de sessões e testes de autorização. 

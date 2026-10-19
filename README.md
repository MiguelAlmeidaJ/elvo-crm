# ELVO CRM

Monorepo TypeScript do ELVO CRM, produto da ANOAR.

## Stack

Next.js 15 / React 19, NestJS 11, Prisma 6, PostgreSQL, pnpm workspace, Docker Compose e PM2.

## Inicialização local

```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
# Preencha SESSION_SECRET (32+ caracteres) e SETUP_KEY.
pnpm install
docker compose up -d
pnpm --filter @elvo/api prisma:generate
pnpm --filter @elvo/api prisma:deploy
pnpm dev
```

Web: `http://localhost:3000` · API: `http://localhost:3001/api/v1` · Health: `http://localhost:3001/api/v1/health`.

## Bootstrap inicial

O bootstrap cria a primeira empresa e o primeiro `SYSTEM_ADMIN`. Só funciona quando ainda não há usuários:

```powershell
$body = @{
  key = "SUA_SETUP_KEY"
  name = "Administrador"
  email = "admin@exemplo.com"
  password = "SENHA_FORTE_COM_12_OU_MAIS"
  organization = "ANOAR"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/bootstrap -ContentType "application/json" -Body $body
```

Depois, entre em `/login`, remova `SETUP_KEY` do ambiente e reinicie a API.

## Empresas e usuários

O e-mail é único no sistema. A mesma identidade pode possuir vínculos e papéis diferentes em várias empresas. Quando existem vários vínculos, o seletor de empresa aparece no header.

Papéis:

- `SYSTEM_ADMIN`: administra Empresas, Módulos, Usuários e Configurações da plataforma.
- `TENANT_ADMIN`: administra usuários e recursos da empresa ativa.
- `USER`: utiliza os recursos operacionais liberados para a empresa.

Pelo terminal:

```powershell
pnpm user:create -- --list-orgs
$env:CREATE_USER_PASSWORD="uma-senha-forte-com-12-caracteres"
pnpm user:create -- --name "Maria Silva" --email maria@exemplo.com --org slug-da-organizacao --role USER
Remove-Item Env:CREATE_USER_PASSWORD
```

Se o e-mail já existir, o comando cria somente o novo vínculo e não altera a senha. Para esse caso, `CREATE_USER_PASSWORD` não é necessário.

## Módulos comerciais

Os módulos `LEADS`, `WHATSAPP` e `EMAIL` são cadastrados globalmente e habilitados por empresa no painel do Administrador do Sistema. A autorização é validada no backend, não apenas escondida no menu. O módulo de e-mail já faz parte do catálogo para evolução futura; envio de e-mail ainda não foi implementado.

## Buscador gratuito de leads

O módulo usa Nominatim e Overpass sobre dados do OpenStreetMap. Não requer chave paga. Configure um identificador real de contato:

```env
LEAD_SEARCH_USER_AGENT="ELVO-CRM/1.0 (contato@suaempresa.com.br)"
NOMINATIM_URL=https://nominatim.openstreetmap.org
OVERPASS_URL=https://overpass.kumi.systems/api/interpreter
```

A API serializa geocodificações, respeita o intervalo mínimo e mantém cache local. As instâncias públicas são adequadas para desenvolvimento e volume moderado; para operação comercial em escala, use instâncias próprias ou um provedor com SLA.

## WhatsApp gratuito com WPPConnect

O WPPConnect Server já está incluído no `docker-compose.yml`. Não há chave comercial: `WPP_SECRET_KEY` é apenas uma senha local escolhida por você para proteger o serviço. Use o mesmo valor no `.env` da raiz e no `apps/api/.env`:

```env
WPP_CONNECT_URL=http://127.0.0.1:21465
WPP_SECRET_KEY=gere-um-segredo-aleatorio-e-longo
```

Inicie o serviço com `docker compose up -d wppconnect`, habilite o módulo `WHATSAPP` para a empresa em `/admin/modulos` e acesse `/whatsapp`. O administrador cria a sessão, lê o QR Code e testa o envio. Sessão e token são armazenados por tenant; o segredo do servidor nunca é enviado ao navegador.

O WPPConnect usa o WhatsApp Web e não é uma integração oficial da Meta. Portanto, existe risco de desconexão ou bloqueio; evite disparos em massa e use a API oficial da Meta quando a operação exigir garantia contratual.

## Deploy com PM2

```powershell
pnpm install --frozen-lockfile
pnpm --filter @elvo/api prisma:generate
pnpm --filter @elvo/api prisma:deploy
pnpm build
pm2 restart ecosystem.config.cjs --update-env
```

Configure também `SESSION_SECRET`, `WEB_ORIGIN` e, quando necessário, `API_INTERNAL_URL`. Use HTTPS e adicione proteção contra força bruta, auditoria, revogação de sessões e testes de autorização antes de produção pública.

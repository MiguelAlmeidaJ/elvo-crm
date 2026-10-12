# Manual de marca — ELVO CRM

A identidade visual foi definida a partir do guia entregue pela ANOAR em outubro de 2026.

## Essência
**Nome:** elvocrm · **Assinatura:** Conexões que impulsionam negócios.

Personalidade: moderna, tecnológica, próxima e confiável.

## Cores oficiais
| Token | Valor | Uso |
| --- | --- | --- |
| Midnight | `#101B2B` | Fundo escuro, sidebar, texto principal |
| Mint Tech | `#5DE0BE` | CTA, destaques e seleção |
| Cloud | `#F5F7FA` | Fundo do dashboard |
| White | `#FFFFFF` | Superfícies e cartões |
| Slate | `#64748B` | Textos secundários |
| Success | `#16A085` | Indicadores positivos |

## Tipografia
- **Sora:** títulos, cabeçalhos e comunicação.
- **Inter:** UI, formulários, tabelas e microtextos.
- Carregamento realizado por `next/font/google`.

## Logotipos oficiais
Coloque os assets originais, normalizados, em `apps/web/public/brand`:

- `logo-dark.png` — versão verde-menta e branca, para fundos escuros.
- `logo-white.png` — versão branca.
- `logo-light.png` — versão marinho + aqua, para fundos claros.
- `favicon-source.png` — símbolo isolado.
- `favicon.png` — ícone para browser.

Os arquivos foram preparados a partir do ZIP fornecido pela ANOAR e estão disponíveis no pacote separado entregue com esta implementação. **Devem ser copiados antes de rodar o frontend.**

## Regras de interface
- Sidebar Midnight, área principal Cloud, cards White.
- CTA Mint Tech com texto Midnight.
- Texto secundário Slate; estados de sucesso Success.
- Cantos moderadamente arredondados, sombra discreta.
- Não inserir logos redesenhadas por CSS ou texto em substituição às versões oficiais.
- A tela atual é um *preview* estático do visual e não deve ser interpretada como dados reais.

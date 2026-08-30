# RelatórioFácil

MVP web do RelatórioFácil — auditorias de campo com checklist, fotos, nota automática, geração de PDF e envio controlado de relatório.

## Estado atual

O motor operacional já foi validado ponta a ponta:

Tally → Airtable → cálculo da nota → Google Docs → fotos → PDF → Google Drive → Gmail → atualização do Airtable.

A camada web deste repositório evolui esse motor sem misturar outros projetos. Hoje ela já inclui:

- landing page responsiva;
- login e cadastro com Supabase Auth;
- confirmação de e-mail e callback SSR;
- área protegida em `/app`;
- fundação multi-tenant com RLS;
- dashboard com dados reais do tenant autenticado;
- gestão de clientes e lojas;
- histórico de visitas e relatórios;
- filtros por cliente, loja, status e período;
- acesso ao formulário atual de auditoria;
- CI com audit, typecheck e build.

## Stack

- Next.js 15
- React 19
- TypeScript
- Supabase Auth + Postgres + RLS
- `@supabase/ssr`
- CSS nativo

## Rodar localmente

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e configure, no mínimo:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` continua aceito apenas por compatibilidade com ambientes legados. Nunca use `service_role` ou qualquer segredo em variável `NEXT_PUBLIC_*`.

## Autenticação

Rotas principais:

- `/login` — entrada por e-mail e senha;
- `/cadastro` — criação de conta;
- `/auth/callback` — troca segura do código/token de confirmação por sessão;
- `/app` — área autenticada.

O cadastro envia `full_name` em `user_metadata`. O trigger versionado em `supabase/migrations` cria automaticamente o registro correspondente em `public.profiles`.

No staging e em produção, a origem pública do app deve constar em **Authentication → URL Configuration → Redirect URLs** no Supabase, porque o cadastro usa a origem atual para `emailRedirectTo`.

## Multi-tenant

A fundação de dados está versionada em `supabase/migrations` e contém:

- `profiles`;
- `clients`;
- `client_memberships`;
- `stores`;
- `visits`;
- `reports`.

O isolamento usa `auth.uid() → client_memberships → client_id`, com RLS nas tabelas expostas. IDs vindos da URL ou de formulários não concedem autorização por si mesmos.

## Staging na Vercel

Antes do primeiro teste público:

1. importar este repositório GitHub na Vercel;
2. configurar `NEXT_PUBLIC_SUPABASE_URL`;
3. configurar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
4. manter `NEXT_PUBLIC_AUDIT_FORM_URL=https://tally.so/r/0QRR4A` enquanto o formulário próprio ainda não substituir o Tally;
5. copiar a URL do deployment e adicioná-la à allowlist de Redirect URLs do Supabase;
6. testar cadastro → confirmação de e-mail → login → criação do primeiro cliente → criação de loja.

O conector usado durante o desenvolvimento consegue listar e inspecionar projetos/deployments Vercel, mas não expõe criação/importação de um projeto Git novo. Por isso o primeiro import precisa existir antes da automação de deploy/observabilidade.

## Segurança

- nenhuma credencial real deve ser commitada;
- chaves públicas Supabase podem estar no browser, protegidas por RLS;
- `service_role`, Airtable tokens e credenciais Google nunca devem ir para o cliente;
- `/app` é validado no servidor e a sessão é renovada pelo middleware;
- o callback de autenticação restringe redirecionamento a caminhos locais;
- CI roda `npm audit --omit=dev --audit-level=high`, `npm run typecheck` e `npm run build`.

## Próxima integração

A camada web já lê o Supabase, mas o motor operacional atual ainda grava principalmente em Airtable/Google Drive/Gmail. O próximo passo de backend é espelhar de forma segura as visitas processadas para `visits`/`reports` no Supabase, preservando o motor existente até a substituição gradual do Tally/Airtable.

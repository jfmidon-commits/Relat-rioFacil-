# RelatórioFácil

MVP web do RelatórioFácil — auditorias de campo com checklist, fotos, nota automática, geração de PDF e envio controlado de relatório.

## Estado atual

O motor operacional foi validado ponta a ponta:

Tally → Airtable → cálculo da nota → Google Docs → fotos → PDF → Google Drive → Gmail → atualização do Airtable.

Este repositório contém a camada web do produto e é separado dos demais projetos.

A camada web inclui:

- landing page responsiva;
- área operacional autenticada em `/app`;
- página de login em `/login`;
- Supabase Auth preparado com `@supabase/ssr`;
- sessão renovada por middleware e validada novamente no servidor;
- base da área de relatórios protegida;
- acesso ao formulário de auditoria;
- configuração por variáveis de ambiente;
- CI com typecheck e build.

## Stack

- Next.js 15
- React 19
- TypeScript
- Supabase Auth
- CSS nativo

## Rodar localmente

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e configure, no mínimo:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

A `anon key`/publishable key é própria para uso no cliente. Nunca use `service_role` no navegador ou em variável `NEXT_PUBLIC_*`.

Sem as variáveis reais do Supabase, o projeto continua compilando e a tela de login informa que a autenticação ainda não está conectada; o login/logout em runtime só pode ser validado depois que um projeto Supabase real for configurado.

## Segurança

Nenhuma credencial real deve ser commitada. Tokens do Airtable, Google ou outros serviços devem existir somente no ambiente do servidor/deploy. Variáveis prefixadas com `NEXT_PUBLIC_` devem conter apenas informações que podem aparecer no navegador.

A proteção de `/app` ocorre em duas camadas:

1. middleware para renovação de sessão e redirecionamento;
2. validação server-side no layout protegido usando `auth.getUser()`.

## Direção do produto

A próxima etapa é a fundação multi-tenant com `auth.users`, `profiles`, `clients`, `client_memberships`, `stores`, `visits` e `reports`, com RLS baseado em `auth.uid()` e membership válida. Depois disso entram dashboard com dados reais, clientes/lojas e integração gradual com o motor operacional existente.

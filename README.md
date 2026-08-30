# RelatórioFácil

MVP web do RelatórioFácil — auditorias de campo com checklist, fotos, nota automática, geração de PDF e envio controlado de relatório.

## Estado atual

O motor operacional foi validado ponta a ponta:

Tally → Airtable → cálculo da nota → Google Docs → fotos → PDF → Google Drive → Gmail → atualização do Airtable.

Este repositório contém a camada web do produto e é separado dos demais projetos.

A primeira versão web inclui:

- landing page responsiva;
- área operacional;
- base da área de relatórios;
- acesso ao formulário de auditoria;
- configuração por variáveis de ambiente;
- CI com typecheck e build.

## Stack

- Next.js
- React
- TypeScript
- CSS nativo

## Rodar localmente

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` quando precisar configurar links ou integrações locais.

## Segurança

Nenhuma credencial deve ser commitada. Tokens do Airtable, Google ou outros serviços devem existir somente no ambiente do servidor/deploy. Variáveis prefixadas com `NEXT_PUBLIC_` devem conter apenas informações que podem aparecer no navegador.

## Direção do produto

A evolução web deve substituir gradualmente a dependência visual de Tally/Airtable sem interromper o motor operacional já validado. As próximas etapas são autenticação e isolamento por cliente, gestão de clientes/lojas dentro do app, histórico conectado ao backend, download/reenvio de PDFs e migração progressiva das automações para APIs próprias.

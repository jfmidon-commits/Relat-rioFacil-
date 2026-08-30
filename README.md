# RelatórioFácil

MVP web do RelatórioFácil — auditorias de campo com checklist, fotos, nota automática, geração de PDF e envio de relatório.

## Estado atual

O motor operacional já foi validado ponta a ponta:

Tally → Airtable → cálculo da nota → Google Docs → fotos → PDF → Google Drive → Gmail → atualização do Airtable.

Este repositório contém a camada web do produto, separada dos demais projetos.

## Stack inicial

- Next.js
- TypeScript
- CSS nativo
- Integrações de produção via variáveis de ambiente no servidor

## Segurança

Nenhuma credencial deve ser commitada. Use `.env.local` localmente e variáveis protegidas no ambiente de deploy.

## Próximas etapas

1. Entrada web profissional
2. Área operacional
3. Clientes e lojas
4. Histórico de visitas
5. Visualização/download de PDFs
6. Autenticação e isolamento por cliente
7. Migração gradual das integrações de bastidores para APIs próprias

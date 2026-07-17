# FIAP SOAT Tech Challenge - Billing Service

Microsserviço de **Orçamento e Pagamento** da oficina mecânica (Fase 4).

## Responsabilidades

- Geração e envio de orçamentos para aprovação do cliente;
- Aprovação/rejeição de orçamento (`/quotations/:serviceOrderNumber/approval` e `/rejection`);
- Registro e verificação de pagamentos via integração com **Mercado Pago** (webhook);
- Publicação de eventos de pagamento (`payment.approved`, `payment.failed`, `payment.refunded`) para o OS Service.

## Arquitetura

Este serviço faz parte de uma arquitetura de microsserviços coordenada via **Saga Pattern orquestrada**, onde o [OS Service](https://github.com/zmathmatos/fiap-soat-os-service) atua como orquestrador.

| Repositório | Conteúdo |
|---|---|
| [fiap-soat-os-service](https://github.com/zmathmatos/fiap-soat-os-service) | Ordens de serviço, cadastro (usuários/veículos), orquestração da Saga |
| **fiap-soat-billing-service** | ← Este repo — Orçamento e pagamento (Mercado Pago) |
| [fiap-soat-execution-service](https://github.com/zmathmatos/fiap-soat-execution-service) | Fila de execução, diagnóstico e reparos |
| [fiap-soat-tech-challenge-lambda](https://github.com/zmathmatos/fiap-soat-tech-challenge-lambda) | Lambda de autenticação via CPF |
| [fiap-soat-tech-challenge-infra-k8s](https://github.com/zmathmatos/fiap-soat-tech-challenge-infra-k8s) | Infraestrutura Kubernetes (VPC, EKS, mensageria) via Terraform |
| [fiap-soat-tech-challenge-infra-db](https://github.com/zmathmatos/fiap-soat-tech-challenge-infra-db) | Infraestrutura dos bancos de dados via Terraform |

## Banco de dados

**MongoDB/DocumentDB** (NoSQL) — banco próprio e exclusivo deste serviço. Nenhum outro serviço acessa este banco diretamente.

## Comunicação

- **Assíncrona**: comandos recebidos e eventos publicados via mensageria (RabbitMQ);
- **Síncrona**: API REST para consultas de orçamento e catálogo.

## Stack

Node.js, TypeScript, Express — Clean Architecture (domain / application / infrastructure / interface).


## Rodando localmente com Docker

O `docker-compose.yml` sobe todo o stack necessário para desenvolvimento local: o serviço `app`, um `mongo` (MongoDB) e um `mailhog` (servidor SMTP de testes).

### Pré-requisitos

- Docker e Docker Compose instalados;
- Um arquivo `.env` na raiz do projeto (copie a partir do `.env.example`):

```bash
cp .env.example .env
```

Os valores padrão do `.env.example` já apontam para o `mailhog` como servidor SMTP local (`SMTP_HOST=localhost`, `SMTP_PORT=1025`), então nenhum ajuste é necessário para enviar e-mails localmente.

### Subindo o stack

```bash
# Build + start de todos os serviços (app, mongo, mailhog)
docker compose up --build
# ou: npm run docker:up:build

# Start sem rebuild
docker compose up
# ou: npm run docker:up

# Rebuildar apenas o app após alterações de código
docker compose up --build app

# Ver logs do app
docker compose logs -f app
# ou: npm run docker:logs

# Parar os serviços
docker compose down
# ou: npm run docker:down

# Parar os serviços e remover volumes (ex.: dados do Mongo)
docker compose down -v
# ou: npm run docker:down:volumes
```

Após subir o stack, a API fica disponível em `http://localhost:3001` (ou na porta definida em `PORT` no `.env`).

### Acessando o Mailhog

Este serviço envia e-mails (orçamentos, links de pagamento) via `nodemailer`. Em ambiente local, esses e-mails **não** são enviados de verdade — eles são capturados pelo Mailhog, que atua como um servidor SMTP de teste.

Para visualizar os e-mails enviados:

1. Suba o stack com `docker compose up`;
2. Acesse a UI do Mailhog em [http://localhost:8025](http://localhost:8025);
3. Todos os e-mails disparados pela aplicação (ex.: notificação de orçamento gerado, link de pagamento) aparecerão listados ali, com o conteúdo completo do e-mail (HTML, texto, headers).

Não é necessário nenhum login ou configuração adicional — o Mailhog aceita qualquer e-mail enviado para a porta SMTP `1025` e os expõe na UI web na porta `8025`.

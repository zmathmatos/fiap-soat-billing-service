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

O broker **RabbitMQ**, usado para publicar os eventos de pagamento, não faz parte deste `docker-compose.yml` — ele sobe junto com a stack do [fiap-soat-os-service](https://github.com/zmathmatos/fiap-soat-os-service) (`npm run docker:dev`) e é compartilhado via a rede Docker externa `fiap-net`. Suba o `os-service` antes deste repositório; veja a seção ["Rodar junto com o billing-service"](https://github.com/zmathmatos/fiap-soat-os-service#rodar-junto-com-o-billing-service) no README dele para o passo a passo.

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

### Testando o fluxo de pagamento localmente (webhook do Mercado Pago)

O Mercado Pago notifica o pagamento (aprovado/recusado) via **webhook HTTP** (`POST /webhooks/mercadopago`). Como esse webhook é disparado pelos servidores do Mercado Pago, ele não consegue alcançar `http://localhost:3001` — é necessário expor a aplicação local através de um túnel público, como o [ngrok](https://ngrok.com/).

1. Suba o stack local normalmente (`docker compose up`);
2. Em outro terminal, exponha a porta da aplicação com o ngrok:

```bash
ngrok http 3001
```

3. Copie a URL pública gerada pelo ngrok (ex.: `https://abcd-1234.ngrok-free.app`) e configure no `.env`:

```bash
MP_NOTIFICATION_URL=https://abcd-1234.ngrok-free.app
```

4. **Recrie o container** (`docker compose up --build app` — só reiniciar não basta, o `docker-compose.yml` precisa repassar a variável de ambiente do `.env` para dentro do container) para que a nova `MP_NOTIFICATION_URL` seja usada na criação da preferência de pagamento — é esse valor que define o `notification_url` enviado ao Mercado Pago (se não for definido, cai para `APP_BASE_URL`);
5. Aprove um orçamento **novo** e efetue o pagamento pelo link gerado — preferências criadas antes de configurar a `MP_NOTIFICATION_URL` não têm o `notification_url` correto e não vão gerar webhook. O webhook do Mercado Pago deverá chegar em `POST /webhooks/mercadopago` na sua aplicação local, e é possível acompanhar as requisições recebidas pela UI web do ngrok em [http://localhost:4040](http://localhost:4040).

> **Atenção:** sem uma `MP_NOTIFICATION_URL`/`APP_BASE_URL` pública (ngrok localmente, ou a URL real do ingress em produção/EKS) **repassada para o container**, o Mercado Pago não tem para onde enviar a notificação e o pagamento nunca será confirmado automaticamente no billing-service.

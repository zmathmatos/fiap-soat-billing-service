# FIAP SOAT Tech Challenge - Billing Service

[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=zmathmatos_fiap-soat-billing-service&metric=alert_status)](https://sonarcloud.io/summary/overall?id=zmathmatos_fiap-soat-billing-service)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=zmathmatos_fiap-soat-billing-service&metric=coverage)](https://sonarcloud.io/component_measures?id=zmathmatos_fiap-soat-billing-service&metric=coverage)

Microsserviço de **Orçamento e Pagamento** da oficina mecânica (Fase 4).

## Responsabilidades

- Consumo do evento `quotation.requested` (publicado pelo `fiap-soat-os-service` via RabbitMQ) para geração e envio de orçamentos por e-mail;
- Aprovação/rejeição de orçamento via links enviados por e-mail (`GET /quotations/:id/approve` e `GET /quotations/:id/reject`);
- Registro e verificação de pagamentos via integração com **Mercado Pago** (webhook);
- Publicação dos eventos do domínio de cobrança no exchange `payment-events`: `payment.approved`, `payment.failed` e `quotation.rejected`.

### Eventos publicados

| Exchange (topic) | Routing key | Consumido por | Efeito |
|---|---|---|---|
| `payment-events` | `payment.approved` | os-service, execution-service | OS → "Em execução"; ordem entra na fila de execução |
| `payment-events` | `payment.failed` | os-service, execution-service | OS → "Finalizado"; ordem cancelada (compensação) |
| `payment-events` | `quotation.rejected` | execution-service | Ordem cancelada (compensação); o os-service recebe esse caso via REST |

Este serviço consome o evento `quotation.requested` do exchange `quotation-events` (fila `billing-service.quotation-events`) e é acionado pelo webhook do Mercado Pago para confirmação de pagamento.

## Arquitetura

> Diagrama de componentes (Clean Architecture) deste serviço: [`docs/architecture.mmd`](docs/architecture.mmd).

Este serviço faz parte de uma arquitetura de microsserviços coordenada via **Saga Pattern coreografada (Choreography)**: não há um orquestrador central — cada serviço publica e consome eventos de domínio via RabbitMQ e reage a eles de forma autônoma para dar continuidade ao fluxo da saga.

| Repositório | Conteúdo |
|---|---|
| [fiap-soat-os-service](https://github.com/zmathmatos/fiap-soat-os-service) | Ordens de serviço, cadastro (usuários/veículos), participante da Saga coreografada |
| **fiap-soat-billing-service** | ← Este repo — Orçamento e pagamento (Mercado Pago) |
| [fiap-soat-execution-service](https://github.com/zmathmatos/fiap-soat-execution-service) | Filas de diagnóstico e execução, reparos — publica `diagnostic.finished` |
| [fiap-soat-tech-challenge-lambda](https://github.com/zmathmatos/fiap-soat-tech-challenge-lambda) | Lambda de autenticação via CPF |
| [fiap-soat-tech-challenge-infra-k8s](https://github.com/zmathmatos/fiap-soat-tech-challenge-infra-k8s) | Infraestrutura Kubernetes (VPC, EKS, mensageria) via Terraform |
| [fiap-soat-tech-challenge-infra-db](https://github.com/zmathmatos/fiap-soat-tech-challenge-infra-db) | Infraestrutura dos bancos de dados via Terraform |

## Banco de dados

**MongoDB/DocumentDB** (NoSQL) — banco próprio e exclusivo deste serviço. Nenhum outro serviço acessa este banco diretamente.

## Comunicação

- **Assíncrona**: criação de orçamento via consumo do evento `quotation.requested` (RabbitMQ) e publicação dos eventos de pagamento (`payment.approved`, `payment.failed`, `quotation.rejected`);
- **Síncrona**: API REST para aprovação/rejeição de orçamento (`GET /quotations/:id/approve` e `GET /quotations/:id/reject`, acionados por links no e-mail) e webhook do Mercado Pago (`POST /webhooks/mercadopago`).

## Observabilidade

O serviço roda com o agente APM do New Relic carregado antes da aplicação (`node -r newrelic dist/server.js`). A configuração fica em `newrelic.js` e é controlada por variáveis de ambiente, então o agente só sobe quando `NEW_RELIC_ENABLED=true` — em desenvolvimento e nos testes ele fica desligado.

| Variável | Origem | Descrição |
|---|---|---|
| `NEW_RELIC_ENABLED` | ConfigMap (CD) | Liga o agente. `true` em produção |
| `NEW_RELIC_APP_NAME` | Variable do repo | Nome da aplicação no New Relic. Padrão: `fiap-billing-service` |
| `NEW_RELIC_LICENSE_KEY` | Secret do repo | Chave de licença da conta |

O **distributed tracing** está habilitado nos três microsserviços, o que permite acompanhar uma ordem de serviço atravessando `os-service → execution-service → billing-service` em um único trace, mesmo com os saltos assíncronos via RabbitMQ. O forwarding de logs também está ligado.

## Stack

Node.js, TypeScript, Express, MongoDB (Mongoose), RabbitMQ (amqplib), Mercado Pago, nodemailer, New Relic APM — Clean Architecture (domain / application / infrastructure / interface).


## Rodando localmente com Docker

O `docker-compose.yml` sobe todo o stack necessário para desenvolvimento local: o serviço `app`, um `mongo` (MongoDB) e um `mailhog` (servidor SMTP de testes).

O broker **RabbitMQ**, usado para publicar eventos de pagamento e para consumir `quotation.requested` (criação de orçamento), não faz parte deste `docker-compose.yml` — ele sobe junto com a stack do [fiap-soat-os-service](https://github.com/zmathmatos/fiap-soat-os-service) (`npm run docker:dev`) e é compartilhado via a rede Docker externa `fiap-net`. **Suba o `os-service` antes deste repositório** — ele é o dono do broker e da rede `fiap-net`; veja a seção ["Rodar junto com o billing-service"](https://github.com/zmathmatos/fiap-soat-os-service#rodar-junto-com-o-billing-service) no README dele para o passo a passo.

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

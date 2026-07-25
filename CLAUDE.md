# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development (with hot reload)
npm run dev

# Run in production
npm start

# Lint
npm run lint
npm run lint:fix

# Tests
npm test                        # all tests
npm run test:unit               # unit tests only
npm run test:integration        # integration tests only
npm run test:coverage           # with coverage report (min 80%)
npm test -- --testPathPattern=<file>  # single test file
```

## Architecture

This service follows **Clean Architecture** with four layers:

```
src/
  domain/           # Entities, value objects, repository interfaces, domain events
  application/      # Use cases, DTOs, service interfaces (no framework dependencies)
  infrastructure/   # MongoDB repos, Mercado Pago client, nodemailer, RabbitMQ adapters
  interface/        # Express routes/controllers, webhook handlers, request/response mappers
```

Dependencies point inward only: `interface → application → domain ← infrastructure`.

## Service Responsibilities & Flow

The ecosystem uses a **choreographed saga**: no central orchestrator, and each service publishes the events of the steps it owns. This service owns the quotation and payment steps and publishes everything on the `payment-events` topic exchange.

1. **Receive service order**: `fiap-soat-os-service` POSTs a service order with status `"Aguardando aprovação"` to this service's REST endpoint. That status is reached when `fiap-soat-execution-service` publishes `diagnostic.finished` (it owns the diagnosis queue) and the os-service applies it.
2. **Generate quotation**: persist quotation to MongoDB and send an email via nodemailer (Mailhog for local dev).
3. **Quotation rejected**: REST callback to `fiap-soat-os-service` to set status → `"Finalizado"`, **and** publish `quotation.rejected` so `fiap-soat-execution-service` cancels the order (saga compensation).
4. **Quotation approved**: send payment email to customer; create a Mercado Pago payment preference.
5. **Payment confirmed** (Mercado Pago webhook): persist the full Mercado Pago payment payload to MongoDB, then publish `payment.approved` — `fiap-soat-os-service` sets status → `"Em execução"` and `fiap-soat-execution-service` appends the order to the execution queue.
6. **Payment rejected/cancelled**: publish `payment.failed` — `fiap-soat-os-service` sets status → `"Finalizado"` and `fiap-soat-execution-service` cancels the order.

Every published message carries a `messageId`; consumers dedupe on it. Status updates for payment outcomes are async-only — this service does not call `fiap-soat-os-service` over REST for them (only `quotation.rejected` still uses the synchronous REST callback, in addition to its event).

## Key Integrations

| Integration | Purpose | Config key |
|---|---|---|
| MongoDB / DocumentDB | Sole database — no other service accesses it | `MONGODB_URI` |
| Mercado Pago API | Payment preference creation + webhook verification | `MP_ACCESS_TOKEN` |
| nodemailer + Mailhog | Email sending (quotations, payment links) | `SMTP_HOST`, `SMTP_PORT` |
| fiap-soat-os-service | Update service order status for `quotation.rejected` (sync REST call) | `OS_SERVICE_URL` |
| RabbitMQ | Publish `payment.approved`/`payment.failed`/`quotation.rejected` on the `payment-events` exchange, consumed by `fiap-soat-os-service` (status) and `fiap-soat-execution-service` (queues/compensation) | `RABBITMQ_URL`, exchange/queue names |

Mercado Pago integration docs: https://www.mercadopago.com.br/developers/pt

## API Documentation

API documentation is maintained as a **Postman collection** (`postman_collection.json`) at the root of this repository. Keep the collection up to date whenever endpoints are added or changed — it is the authoritative reference for request/response shapes, auth headers, and example payloads.

## Testing Requirements

- **Minimum 80% coverage** enforced in CI.
- Unit tests: use cases and domain logic in isolation (mock all infrastructure boundaries).
- Integration tests: spin up a real MongoDB (e.g., `mongodb-memory-server`) and test the full use-case-to-repo path.
- Mercado Pago and nodemailer must be mocked in all tests.

## Docker

This repo ships a `Dockerfile` that builds the production image pushed to EKS. A `docker-compose.yml` is used for local development and spins up:

| Service | Purpose |
|---|---|
| `app` | The billing service itself (built from the local `Dockerfile`) |
| `mongo` | MongoDB instance |
| `mailhog` | SMTP test server — catches outgoing emails at `http://localhost:8025` |

```bash
# Start local stack
docker compose up --build

# Rebuild only the app after code changes
docker compose up --build app
```

## CI/CD

GitHub Actions workflows live in `.github/workflows/`:

- **CI** (`ci.yml`): runs on every push/PR — installs dependencies, runs lint, and executes the full test suite. Fails if any test fails. Coverage enforcement, security verification, and static code analysis are delegated to **SonarCloud**.
- **CD** (`cd.yml`): runs on merge to `master` — builds the Docker image, pushes it to the container registry, and deploys to EKS.

## Infrastructure

- **Terraform** provisions all AWS resources (VPC, EKS cluster, RabbitMQ broker, DocumentDB) — see sibling repo `fiap-soat-tech-challenge-infra-k8s` and `fiap-soat-tech-challenge-infra-db`.
- **Kubernetes** (EKS) deployment manifests live in the infra-k8s repo; this repo produces the Docker image that is deployed there.

## Microservice Ecosystem

| Repo | Role |
|---|---|
| `fiap-soat-os-service` | Sends service orders here, receives status updates via published events (choreographed saga participant) |
| **`fiap-soat-billing-service`** | This service |
| `fiap-soat-execution-service` | Owns the diagnosis/execution queues; publishes `diagnostic.finished`, consumes `payment.approved`/`payment.failed`/`quotation.rejected` |
| `fiap-soat-tech-challenge-lambda` | CPF-based auth lambda |
| `fiap-soat-tech-challenge-infra-k8s` | Kubernetes + messaging infrastructure (Terraform) |
| `fiap-soat-tech-challenge-infra-db` | Database infrastructure (Terraform) |

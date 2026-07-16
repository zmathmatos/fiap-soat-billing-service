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
  infrastructure/   # MongoDB repos, Mercado Pago client, nodemailer, SQS/SNS adapters
  interface/        # Express routes/controllers, webhook handlers, request/response mappers
```

Dependencies point inward only: `interface → application → domain ← infrastructure`.

## Service Responsibilities & Flow

1. **Receive service order**: `fiap-soat-os-service` POSTs a service order with status `"Aguardando aprovação"` to this service's REST endpoint.
2. **Generate quotation**: persist quotation to MongoDB and send an email via nodemailer (Mailhog for local dev).
3. **Quotation rejected**: send the `quotation.rejected` event to `fiap-soat-os-service/` to set status → `"Finalizado"`.
4. **Quotation approved**: send payment email to customer; create a Mercado Pago payment preference.
5. **Payment confirmed** (Mercado Pago webhook): persist the full Mercado Pago payment payload to MongoDB, then send the `payment.approved` event to `fiap-soat-os-service` to set status → `"Em execução"`.
6. **Payment events published**: `payment.approved` and `payment.failed` via SNS/SQS. If the `payment.faied` is send to `fiap-soat-os-service`, then it will update the status to `Finalizado`.

## Key Integrations

| Integration | Purpose | Config key |
|---|---|---|
| MongoDB / DocumentDB | Sole database — no other service accesses it | `MONGODB_URI` |
| Mercado Pago API | Payment preference creation + webhook verification | `MP_ACCESS_TOKEN` |
| nodemailer + Mailhog | Email sending (quotations, payment links) | `SMTP_HOST`, `SMTP_PORT` |
| fiap-soat-os-service | Update service order status (sync REST calls) | `OS_SERVICE_URL` |
| AWS SQS / SNS | Receive commands, publish payment events (async) | `AWS_*`, queue/topic ARNs |

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

- **Terraform** provisions all AWS resources (VPC, EKS cluster, SQS queues, SNS topics, DocumentDB) — see sibling repo `fiap-soat-tech-challenge-infra-k8s` and `fiap-soat-tech-challenge-infra-db`.
- **Kubernetes** (EKS) deployment manifests live in the infra-k8s repo; this repo produces the Docker image that is deployed there.

## Microservice Ecosystem

| Repo | Role |
|---|---|
| `fiap-soat-os-service` | Orchestrator — sends service orders here, receives status updates |
| **`fiap-soat-billing-service`** | This service |
| `fiap-soat-execution-service` | Consumes `payment.approved` to start repair queue |
| `fiap-soat-tech-challenge-lambda` | CPF-based auth lambda |
| `fiap-soat-tech-challenge-infra-k8s` | Kubernetes + messaging infrastructure (Terraform) |
| `fiap-soat-tech-challenge-infra-db` | Database infrastructure (Terraform) |

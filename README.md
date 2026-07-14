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

- **Assíncrona**: comandos recebidos e eventos publicados via mensageria (SQS/SNS);
- **Síncrona**: API REST para consultas de orçamento e catálogo.

## Stack

Node.js, TypeScript, Express — Clean Architecture (domain / application / infrastructure / interface).

## Status

🚧 Em desenvolvimento — migração da funcionalidade de orçamento/pagamento a partir do monolito da Fase 3.

import { setWorldConstructor, World } from '@cucumber/cucumber';
import {
  InMemoryQuotationRepository,
  InMemoryPaymentRepository,
  FakeEmailService,
  FakePaymentService,
} from '../../tests/fakes/InMemoryRepositories';
import { CreateQuotationUseCase } from '../../src/application/use-cases/CreateQuotationUseCase';
import { ApproveQuotationUseCase } from '../../src/application/use-cases/ApproveQuotationUseCase';
import { RejectQuotationUseCase } from '../../src/application/use-cases/RejectQuotationUseCase';
import { ProcessPaymentWebhookUseCase } from '../../src/application/use-cases/ProcessPaymentWebhookUseCase';
import { QuotationResponseDto } from '../../src/application/dtos/QuotationResponseDto';

/**
 * Shared state for the billing saga BDD scenarios. Drives the real quotation /
 * payment use cases against in-memory repositories and fake MP/email adapters,
 * so the choreographed saga's outbox events are exercised without infra.
 */
export class BillingWorld extends World {
  readonly quotationRepo = new InMemoryQuotationRepository();
  readonly paymentRepo = new InMemoryPaymentRepository();
  readonly email = new FakeEmailService();
  readonly paymentService = new FakePaymentService();

  readonly createQuotation = new CreateQuotationUseCase(this.quotationRepo, this.email);
  readonly approveQuotation = new ApproveQuotationUseCase(
    this.quotationRepo,
    this.paymentRepo,
    this.email,
    this.paymentService,
  );
  readonly rejectQuotation = new RejectQuotationUseCase(this.quotationRepo);
  readonly processWebhook = new ProcessPaymentWebhookUseCase(this.paymentRepo, this.paymentService);

  currentQuotation: QuotationResponseDto | null = null;
  private seq = 0;

  nextNumber(): number {
    return ++this.seq;
  }
}

setWorldConstructor(BillingWorld);

import { Quotation } from '../../src/domain/entities/Quotation';
import { Payment } from '../../src/domain/entities/Payment';
import { IQuotationRepository } from '../../src/domain/repositories/IQuotationRepository';
import { IPaymentRepository } from '../../src/domain/repositories/IPaymentRepository';
import { PendingEvent } from '../../src/domain/events/PendingEvent';
import {
  IPaymentService,
  CreatePreferenceInput,
  CreatePreferenceOutput,
} from '../../src/application/services/IPaymentService';
import { IEmailService, SendEmailOptions } from '../../src/application/services/IEmailService';

/** In-memory quotation repo that records outbox events for BDD assertions. */
export class InMemoryQuotationRepository implements IQuotationRepository {
  private store = new Map<string, Quotation>();
  readonly pendingEvents: PendingEvent[] = [];

  async save(quotation: Quotation): Promise<void> {
    this.store.set(quotation.id, quotation);
  }
  async findById(id: string): Promise<Quotation | null> {
    return this.store.get(id) ?? null;
  }
  async findByServiceOrderId(serviceOrderId: string): Promise<Quotation | null> {
    for (const q of this.store.values()) if (q.serviceOrderId === serviceOrderId) return q;
    return null;
  }
  async update(quotation: Quotation): Promise<void> {
    this.store.set(quotation.id, quotation);
  }
  async atomicUpdateWithEvent(
    id: string,
    fields: Record<string, unknown>,
    event: PendingEvent,
  ): Promise<void> {
    const q = this.store.get(id);
    if (q) Object.assign(q, fields);
    this.pendingEvents.push(event);
  }
  async findWithPendingEvents(): Promise<Array<{ entityId: string; pendingEvents: PendingEvent[] }>> {
    return [];
  }
  async clearPendingEvent(): Promise<void> {}
}

/** In-memory payment repo that records outbox events for BDD assertions. */
export class InMemoryPaymentRepository implements IPaymentRepository {
  private store = new Map<string, Payment>();
  readonly pendingEvents: PendingEvent[] = [];

  async save(payment: Payment): Promise<void> {
    this.store.set(payment.id, payment);
  }
  async findById(id: string): Promise<Payment | null> {
    return this.store.get(id) ?? null;
  }
  async findByQuotationId(quotationId: string): Promise<Payment | null> {
    for (const p of this.store.values()) if (p.quotationId === quotationId) return p;
    return null;
  }
  async findByMercadoPagoPaymentId(mercadoPagoPaymentId: string): Promise<Payment | null> {
    for (const p of this.store.values()) if (p.mercadoPagoPaymentId === mercadoPagoPaymentId) return p;
    return null;
  }
  async update(payment: Payment): Promise<void> {
    this.store.set(payment.id, payment);
  }
  async atomicUpdateWithEvent(
    id: string,
    fields: Record<string, unknown>,
    event: PendingEvent,
  ): Promise<void> {
    const p = this.store.get(id);
    if (p) Object.assign(p, fields);
    this.pendingEvents.push(event);
  }
  async findWithPendingEvents(): Promise<Array<{ entityId: string; pendingEvents: PendingEvent[] }>> {
    return [];
  }
  async clearPendingEvent(): Promise<void> {}
}

/** No-op email service — captures nothing, just satisfies the boundary. */
export class FakeEmailService implements IEmailService {
  readonly sent: SendEmailOptions[] = [];
  async send(options: SendEmailOptions): Promise<void> {
    this.sent.push(options);
  }
}

/**
 * Fake Mercado Pago adapter. `nextPaymentStatus` and `externalReference` are set
 * by the BDD steps to drive the webhook branch (approved / rejected).
 */
export class FakePaymentService implements IPaymentService {
  nextPaymentStatus = 'approved';
  externalReference = '';

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput> {
    return { preferenceId: `pref-${input.quotationId}`, initPoint: 'https://mp.test/checkout' };
  }
  async getPayment(paymentId: string): Promise<Record<string, unknown>> {
    return {
      id: paymentId,
      status: this.nextPaymentStatus,
      external_reference: this.externalReference,
    };
  }
}

import { Payment } from '../entities/Payment';
import { PendingEvent } from '../events/PendingEvent';

export interface IPaymentRepository {
  save(payment: Payment): Promise<void>;
  findById(id: string): Promise<Payment | null>;
  findByQuotationId(quotationId: string): Promise<Payment | null>;
  findByMercadoPagoPaymentId(mercadoPagoPaymentId: string): Promise<Payment | null>;
  update(payment: Payment): Promise<void>;
  atomicUpdateWithEvent(id: string, fields: Record<string, unknown>, event: PendingEvent): Promise<void>;
  findWithPendingEvents(): Promise<Array<{ entityId: string; pendingEvents: PendingEvent[] }>>;
  clearPendingEvent(entityId: string, eventId: string): Promise<void>;
}

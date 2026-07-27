import { Quotation } from '../entities/Quotation';
import { PendingEvent } from '../events/PendingEvent';

export interface IQuotationRepository {
  save(quotation: Quotation): Promise<void>;
  findById(id: string): Promise<Quotation | null>;
  findByServiceOrderId(serviceOrderId: string): Promise<Quotation | null>;
  update(quotation: Quotation): Promise<void>;
  atomicUpdateWithEvent(id: string, fields: Record<string, unknown>, event: PendingEvent): Promise<void>;
  findWithPendingEvents(): Promise<Array<{ entityId: string; pendingEvents: PendingEvent[] }>>;
  clearPendingEvent(entityId: string, eventId: string): Promise<void>;
}

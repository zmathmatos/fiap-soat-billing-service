import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { IQuotationRepository } from '../../domain/repositories/IQuotationRepository';
import { IEventPublisher } from '../../application/services/IEventPublisher';
import { PendingEvent } from '../../domain/events/PendingEvent';

const POLL_INTERVAL_MS = 5000;

export class MongoOutboxPublisher {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly quotationRepository: IQuotationRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  start(): void {
    this.scheduleNext();
    console.log('[MongoOutboxPublisher] started');
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => void this.poll(), POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    try {
      await this.drainRepository(
        () => this.paymentRepository.findWithPendingEvents(),
        (entityId, eventId) => this.paymentRepository.clearPendingEvent(entityId, eventId),
      );
      await this.drainRepository(
        () => this.quotationRepository.findWithPendingEvents(),
        (entityId, eventId) => this.quotationRepository.clearPendingEvent(entityId, eventId),
      );
    } catch (error) {
      console.error('[MongoOutboxPublisher] poll failed', error);
    } finally {
      this.scheduleNext();
    }
  }

  private async drainRepository(
    findFn: () => Promise<Array<{ entityId: string; pendingEvents: PendingEvent[] }>>,
    clearFn: (entityId: string, eventId: string) => Promise<void>,
  ): Promise<void> {
    const records = await findFn();
    for (const { entityId, pendingEvents } of records) {
      for (const event of pendingEvents) {
        await this.publishAndClear(entityId, event, clearFn);
      }
    }
  }

  private async publishAndClear(
    entityId: string,
    event: PendingEvent,
    clearFn: (entityId: string, eventId: string) => Promise<void>,
  ): Promise<void> {
    try {
      await this.dispatch(event);
      await clearFn(entityId, event.id);
    } catch (error) {
      console.error('[MongoOutboxPublisher] failed to publish event, will retry next poll', {
        entityId,
        eventType: event.type,
        eventId: event.id,
        error,
      });
    }
  }

  private async dispatch(event: PendingEvent): Promise<void> {
    switch (event.type) {
      case 'payment.approved':
        await this.eventPublisher.publishPaymentApproved(event.payload);
        break;
      case 'payment.failed':
        await this.eventPublisher.publishPaymentFailed(event.payload);
        break;
      case 'quotation.rejected':
        await this.eventPublisher.publishQuotationRejected(event.payload);
        break;
      default:
        console.warn('[MongoOutboxPublisher] unknown event type, skipping', {
          eventType: event.type,
          eventId: event.id,
        });
    }
  }
}

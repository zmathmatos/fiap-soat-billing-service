import { MongoOutboxPublisher } from '../../../../src/infrastructure/messaging/MongoOutboxPublisher';
import { IPaymentRepository } from '../../../../src/domain/repositories/IPaymentRepository';
import { IQuotationRepository } from '../../../../src/domain/repositories/IQuotationRepository';
import { IEventPublisher } from '../../../../src/application/services/IEventPublisher';
import { PendingEvent } from '../../../../src/domain/events/PendingEvent';

const flushMicrotasks = async (ticks = 8) => {
  for (let i = 0; i < ticks; i++) await Promise.resolve();
};

const makeEvent = (overrides: Partial<PendingEvent> = {}): PendingEvent => ({
  id: 'evt-1',
  type: 'payment.approved',
  payload: { paymentId: 'p-1', serviceOrderId: 'so-1', amount: 500 },
  createdAt: new Date(),
  ...overrides,
});

const makePaymentRepo = (): jest.Mocked<IPaymentRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  findByQuotationId: jest.fn(),
  findByMercadoPagoPaymentId: jest.fn(),
  update: jest.fn(),
  atomicUpdateWithEvent: jest.fn(),
  findWithPendingEvents: jest.fn(),
  clearPendingEvent: jest.fn(),
});

const makeQuotationRepo = (): jest.Mocked<IQuotationRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  findByServiceOrderId: jest.fn(),
  update: jest.fn(),
  atomicUpdateWithEvent: jest.fn(),
  findWithPendingEvents: jest.fn(),
  clearPendingEvent: jest.fn(),
});

const makeEventPublisher = (): jest.Mocked<IEventPublisher> => ({
  publishPaymentApproved: jest.fn(),
  publishPaymentFailed: jest.fn(),
  publishQuotationRejected: jest.fn(),
});

describe('MongoOutboxPublisher', () => {
  let paymentRepo: jest.Mocked<IPaymentRepository>;
  let quotationRepo: jest.Mocked<IQuotationRepository>;
  let eventPublisher: jest.Mocked<IEventPublisher>;
  let publisher: MongoOutboxPublisher;

  beforeEach(() => {
    jest.useFakeTimers();
    paymentRepo = makePaymentRepo();
    quotationRepo = makeQuotationRepo();
    eventPublisher = makeEventPublisher();
    publisher = new MongoOutboxPublisher(paymentRepo, quotationRepo, eventPublisher);

    paymentRepo.findWithPendingEvents.mockResolvedValue([]);
    quotationRepo.findWithPendingEvents.mockResolvedValue([]);
    eventPublisher.publishPaymentApproved.mockResolvedValue(undefined);
    eventPublisher.publishPaymentFailed.mockResolvedValue(undefined);
    eventPublisher.publishQuotationRejected.mockResolvedValue(undefined);
  });

  afterEach(() => {
    publisher.stop();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('starts polling on start()', async () => {
    publisher.start();
    jest.advanceTimersByTime(1000);
    await flushMicrotasks();
    expect(paymentRepo.findWithPendingEvents).toHaveBeenCalledTimes(1);
    expect(quotationRepo.findWithPendingEvents).toHaveBeenCalledTimes(1);
  });

  it('publishes payment.approved and clears the event', async () => {
    const event = makeEvent({ type: 'payment.approved' });
    paymentRepo.findWithPendingEvents.mockResolvedValueOnce([{ entityId: 'p-1', pendingEvents: [event] }]);

    publisher.start();
    jest.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(eventPublisher.publishPaymentApproved).toHaveBeenCalledWith(event.payload);
    expect(paymentRepo.clearPendingEvent).toHaveBeenCalledWith('p-1', 'evt-1');
  });

  it('publishes payment.failed and clears the event', async () => {
    const event = makeEvent({ type: 'payment.failed', payload: { paymentId: 'p-1', serviceOrderId: 'so-1' } });
    paymentRepo.findWithPendingEvents.mockResolvedValueOnce([{ entityId: 'p-1', pendingEvents: [event] }]);

    publisher.start();
    jest.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(eventPublisher.publishPaymentFailed).toHaveBeenCalledWith(event.payload);
    expect(paymentRepo.clearPendingEvent).toHaveBeenCalledWith('p-1', 'evt-1');
  });

  it('publishes quotation.rejected and clears the event', async () => {
    const event = makeEvent({ id: 'evt-q', type: 'quotation.rejected', payload: { quotationId: 'q-1', serviceOrderId: 'so-1' } });
    quotationRepo.findWithPendingEvents.mockResolvedValueOnce([{ entityId: 'q-1', pendingEvents: [event] }]);

    publisher.start();
    jest.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(eventPublisher.publishQuotationRejected).toHaveBeenCalledWith(event.payload);
    expect(quotationRepo.clearPendingEvent).toHaveBeenCalledWith('q-1', 'evt-q');
  });

  it('does not clear the event when publishing fails', async () => {
    const event = makeEvent({ type: 'payment.approved' });
    paymentRepo.findWithPendingEvents.mockResolvedValueOnce([{ entityId: 'p-1', pendingEvents: [event] }]);
    eventPublisher.publishPaymentApproved.mockRejectedValueOnce(new Error('broker down'));

    publisher.start();
    jest.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(paymentRepo.clearPendingEvent).not.toHaveBeenCalled();
  });

  it('continues polling after a DB error', async () => {
    paymentRepo.findWithPendingEvents
      .mockRejectedValueOnce(new Error('mongo down'))
      .mockResolvedValue([]);

    publisher.start();
    jest.advanceTimersByTime(1000);
    await flushMicrotasks();
    jest.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(paymentRepo.findWithPendingEvents).toHaveBeenCalledTimes(2);
  });

  it('stops polling after stop()', async () => {
    publisher.start();
    publisher.stop();
    jest.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(paymentRepo.findWithPendingEvents).not.toHaveBeenCalled();
  });
});

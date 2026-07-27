import { MongoPaymentRepository } from '../../../../src/infrastructure/database/MongoPaymentRepository';
import { MongoQuotationRepository } from '../../../../src/infrastructure/database/MongoQuotationRepository';
import { PaymentModel } from '../../../../src/infrastructure/database/schemas/PaymentSchema';
import { QuotationModel } from '../../../../src/infrastructure/database/schemas/QuotationSchema';
import { PendingEvent } from '../../../../src/domain/events/PendingEvent';

jest.mock('../../../../src/infrastructure/database/schemas/PaymentSchema', () => ({
  PaymentModel: { findOneAndUpdate: jest.fn(), find: jest.fn() },
}));

jest.mock('../../../../src/infrastructure/database/schemas/QuotationSchema', () => ({
  QuotationModel: { findOneAndUpdate: jest.fn(), find: jest.fn() },
}));

const mockPaymentModel = PaymentModel as unknown as {
  findOneAndUpdate: jest.Mock;
  find: jest.Mock;
};
const mockQuotationModel = QuotationModel as unknown as {
  findOneAndUpdate: jest.Mock;
  find: jest.Mock;
};

const event: PendingEvent = {
  id: 'evt-1',
  type: 'payment.approved',
  payload: { serviceOrderId: 'so-1' },
  createdAt: new Date('2026-07-22T10:00:00.000Z'),
};

describe.each([
  ['MongoPaymentRepository', () => new MongoPaymentRepository(), () => mockPaymentModel],
  ['MongoQuotationRepository', () => new MongoQuotationRepository(), () => mockQuotationModel],
] as const)('%s outbox methods', (_name, makeSut, getModel) => {
  beforeEach(() => jest.clearAllMocks());

  it('sets the fields and pushes the pending event in one atomic update', async () => {
    const model = getModel();
    model.findOneAndUpdate.mockResolvedValue(null);

    await makeSut().atomicUpdateWithEvent('id-1', { status: 'approved' }, event);

    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 'id-1' },
      { $set: { status: 'approved' }, $push: { pendingEvents: event } },
    );
  });

  it('lists only documents that still carry pending events', async () => {
    const model = getModel();
    model.find.mockResolvedValue([{ id: 'id-1', pendingEvents: [event] }]);

    const records = await makeSut().findWithPendingEvents();

    expect(model.find).toHaveBeenCalledWith({ 'pendingEvents.0': { $exists: true } });
    expect(records).toEqual([{ entityId: 'id-1', pendingEvents: [event] }]);
  });

  it('defaults to an empty list when the document has no pendingEvents field', async () => {
    const model = getModel();
    model.find.mockResolvedValue([{ id: 'id-1', pendingEvents: undefined }]);

    await expect(makeSut().findWithPendingEvents()).resolves.toEqual([
      { entityId: 'id-1', pendingEvents: [] },
    ]);
  });

  it('pulls only the published event off the document', async () => {
    const model = getModel();
    model.findOneAndUpdate.mockResolvedValue(null);

    await makeSut().clearPendingEvent('id-1', 'evt-1');

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 'id-1' },
      { $pull: { pendingEvents: { id: 'evt-1' } } },
    );
  });

  it('propagates database failures so the poller retries on the next tick', async () => {
    const model = getModel();
    model.findOneAndUpdate.mockRejectedValue(new Error('mongo down'));

    await expect(
      makeSut().atomicUpdateWithEvent('id-1', { status: 'approved' }, event),
    ).rejects.toThrow('mongo down');
  });
});

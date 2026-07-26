import { RejectQuotationUseCase } from '../../../src/application/use-cases/RejectQuotationUseCase';
import { IQuotationRepository } from '../../../src/domain/repositories/IQuotationRepository';
import { Quotation } from '../../../src/domain/entities/Quotation';
import { AppError } from '../../../src/shared/errors/AppError';

const mockRepo: jest.Mocked<IQuotationRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByServiceOrderId: jest.fn(),
  update: jest.fn(),
  atomicUpdateWithEvent: jest.fn(),
  findWithPendingEvents: jest.fn(),
  clearPendingEvent: jest.fn(),
};

const makeQuotation = () =>
  new Quotation({
    id: 'q-1',
    serviceOrderId: 'so-1',
    serviceOrderNumber: 1001,
    customerId: 'c-1',
    customerEmail: 'test@example.com',
    description: 'Fix brakes',
    amount: 500,
  });

describe('RejectQuotationUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects the quotation and atomically enqueues the compensation event', async () => {
    const quotation = makeQuotation();
    mockRepo.findById.mockResolvedValue(quotation);
    mockRepo.atomicUpdateWithEvent.mockResolvedValue(undefined);

    const useCase = new RejectQuotationUseCase(mockRepo);
    const result = await useCase.execute('q-1');

    expect(result.status).toBe('rejected');
    expect(mockRepo.update).not.toHaveBeenCalled();
    expect(mockRepo.atomicUpdateWithEvent).toHaveBeenCalledWith(
      'q-1',
      expect.objectContaining({ status: 'rejected' }),
      expect.objectContaining({
        type: 'quotation.rejected',
        payload: expect.objectContaining({ quotationId: 'q-1', serviceOrderId: 'so-1' }),
      }),
    );
  });

  it('does not call the OS service synchronously (compensation is event-driven)', async () => {
    const quotation = makeQuotation();
    mockRepo.findById.mockResolvedValue(quotation);
    mockRepo.atomicUpdateWithEvent.mockResolvedValue(undefined);

    const useCase = new RejectQuotationUseCase(mockRepo);
    await useCase.execute('q-1');

    // The REST call to os-service was removed; OS service now reacts to the
    // quotation.rejected event published by MongoOutboxPublisher.
    // This test ensures no synchronous HTTP coupling remains.
    expect(mockRepo.atomicUpdateWithEvent).toHaveBeenCalledTimes(1);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('throws 404 when quotation not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const useCase = new RejectQuotationUseCase(mockRepo);
    await expect(useCase.execute('missing')).rejects.toThrow(AppError);
    expect(mockRepo.atomicUpdateWithEvent).not.toHaveBeenCalled();
  });
});

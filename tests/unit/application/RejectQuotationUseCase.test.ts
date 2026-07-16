import { RejectQuotationUseCase } from '../../../src/application/use-cases/RejectQuotationUseCase';
import { IQuotationRepository } from '../../../src/domain/repositories/IQuotationRepository';
import { IOsServiceClient } from '../../../src/application/services/IOsServiceClient';
import { Quotation } from '../../../src/domain/entities/Quotation';
import { AppError } from '../../../src/shared/errors/AppError';

const mockRepo: jest.Mocked<IQuotationRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByServiceOrderId: jest.fn(),
  update: jest.fn(),
};

const mockOsClient: jest.Mocked<IOsServiceClient> = {
  updateStatusToFinished: jest.fn(),
  updateStatusToInProgress: jest.fn(),
};

describe('RejectQuotationUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects quotation and notifies OS service', async () => {
    const quotation = new Quotation({
      id: 'q-1',
      serviceOrderId: 'so-1',
      serviceOrderNumber: 1001,
      customerId: 'c-1',
      customerEmail: 'test@example.com',
      description: 'Fix brakes',
      amount: 500,
    });
    mockRepo.findById.mockResolvedValue(quotation);

    const useCase = new RejectQuotationUseCase(mockRepo, mockOsClient);
    const result = await useCase.execute('q-1');

    expect(result.status).toBe('rejected');
    expect(mockRepo.update).toHaveBeenCalled();
    expect(mockOsClient.updateStatusToFinished).toHaveBeenCalledWith('so-1');
  });

  it('throws 404 when quotation not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const useCase = new RejectQuotationUseCase(mockRepo, mockOsClient);
    await expect(useCase.execute('missing')).rejects.toThrow(AppError);
  });
});

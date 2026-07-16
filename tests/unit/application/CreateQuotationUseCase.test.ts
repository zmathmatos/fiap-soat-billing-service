import { CreateQuotationUseCase } from '../../../src/application/use-cases/CreateQuotationUseCase';
import { IQuotationRepository } from '../../../src/domain/repositories/IQuotationRepository';
import { IEmailService } from '../../../src/application/services/IEmailService';

const mockRepo: jest.Mocked<IQuotationRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByServiceOrderId: jest.fn(),
  update: jest.fn(),
};

const mockEmail: jest.Mocked<IEmailService> = {
  send: jest.fn(),
};

describe('CreateQuotationUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves quotation and sends email', async () => {
    const useCase = new CreateQuotationUseCase(mockRepo, mockEmail);
    const dto = {
      serviceOrderId: 'so-1',
      serviceOrderNumber: 1001,
      customerId: 'c-1',
      customerEmail: 'test@example.com',
      description: 'Fix brakes',
      amount: 500,
    };

    const result = await useCase.execute(dto);

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(mockEmail.send).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('pending');
    expect(result.amount).toBe(500);
  });
});

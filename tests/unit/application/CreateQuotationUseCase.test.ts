import { CreateQuotationUseCase } from '../../../src/application/use-cases/CreateQuotationUseCase';
import { IQuotationRepository } from '../../../src/domain/repositories/IQuotationRepository';
import { IEmailService } from '../../../src/application/services/IEmailService';
import { Quotation } from '../../../src/domain/entities/Quotation';

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
  beforeEach(() => jest.resetAllMocks());

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

  it('is idempotent — skips creation and email when a quotation already exists for the service order', async () => {
    const useCase = new CreateQuotationUseCase(mockRepo, mockEmail);
    const dto = {
      serviceOrderId: 'so-1',
      serviceOrderNumber: 1001,
      customerId: 'c-1',
      customerEmail: 'test@example.com',
      description: 'Fix brakes',
      amount: 500,
    };
    const existing = new Quotation({ ...dto, id: 'existing-id', status: 'pending' });
    mockRepo.findByServiceOrderId.mockResolvedValue(existing);

    const result = await useCase.execute(dto);

    expect(mockRepo.save).not.toHaveBeenCalled();
    expect(mockEmail.send).not.toHaveBeenCalled();
    expect(result.id).toBe('existing-id');
    expect(result.status).toBe('pending');
  });
  
  it('still returns the quotation when the email fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockEmail.send.mockRejectedValueOnce(new Error('ENOTFOUND mailhog'));

    const useCase = new CreateQuotationUseCase(mockRepo, mockEmail);
    const result = await useCase.execute({
      serviceOrderId: 'so-2',
      serviceOrderNumber: 1002,
      customerId: 'c-2',
      customerEmail: 'test@example.com',
      description: 'Fix brakes',
      amount: 500,
    });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.serviceOrderId).toBe('so-2');
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'email.send.error', subject: 'quotation.created' }),
    );

    consoleError.mockRestore();
  });
});

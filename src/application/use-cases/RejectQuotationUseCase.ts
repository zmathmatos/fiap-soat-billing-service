import { IQuotationRepository } from '../../domain/repositories/IQuotationRepository';
import { IOsServiceClient } from '../services/IOsServiceClient';
import { AppError } from '../../shared/errors/AppError';
import { QuotationResponseDto } from '../dtos/QuotationResponseDto';

export class RejectQuotationUseCase {
  constructor(
    private readonly quotationRepository: IQuotationRepository,
    private readonly osServiceClient: IOsServiceClient,
  ) {}

  async execute(quotationId: string): Promise<QuotationResponseDto> {
    const quotation = await this.quotationRepository.findById(quotationId);
    if (!quotation) throw new AppError('Quotation not found', 404);

    quotation.reject();
    await this.quotationRepository.update(quotation);

    await this.osServiceClient.updateStatusToFinished(quotation.serviceOrderId);

    return {
      id: quotation.id,
      serviceOrderId: quotation.serviceOrderId,
      customerId: quotation.customerId,
      customerEmail: quotation.customerEmail,
      description: quotation.description,
      amount: quotation.amount,
      status: quotation.status,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
    };
  }
}

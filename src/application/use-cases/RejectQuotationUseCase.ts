import { randomUUID } from 'crypto';
import { IQuotationRepository } from '../../domain/repositories/IQuotationRepository';
import { AppError } from '../../shared/errors/AppError';
import { QuotationResponseDto } from '../dtos/QuotationResponseDto';

export class RejectQuotationUseCase {
  constructor(private readonly quotationRepository: IQuotationRepository) {}

  async execute(quotationId: string): Promise<QuotationResponseDto> {
    const quotation = await this.quotationRepository.findById(quotationId);
    if (!quotation) throw new AppError('Quotation not found', 404);

    quotation.reject();
    // Atomically persist the rejection and schedule the compensation event.
    // The MongoOutboxPublisher will pick up the pending event and publish
    // quotation.rejected to RabbitMQ; os-service and execution-service both
    // consume it to advance their saga compensation paths.
    await this.quotationRepository.atomicUpdateWithEvent(
      quotation.id,
      { status: quotation.status, updatedAt: quotation.updatedAt },
      {
        id: randomUUID(),
        type: 'quotation.rejected',
        payload: {
          quotationId: quotation.id,
          serviceOrderId: quotation.serviceOrderId,
        },
        createdAt: new Date(),
      },
    );

    return {
      id: quotation.id,
      serviceOrderId: quotation.serviceOrderId,
      serviceOrderNumber: quotation.serviceOrderNumber,
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

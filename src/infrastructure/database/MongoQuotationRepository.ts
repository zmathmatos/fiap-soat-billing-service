import { Quotation } from '../../domain/entities/Quotation';
import { IQuotationRepository } from '../../domain/repositories/IQuotationRepository';
import { QuotationModel } from './schemas/QuotationSchema';

export class MongoQuotationRepository implements IQuotationRepository {
  async save(quotation: Quotation): Promise<void> {
    await QuotationModel.create({
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
    });
  }

  async findById(id: string): Promise<Quotation | null> {
    const doc = await QuotationModel.findOne({ id });
    if (!doc) return null;
    return new Quotation({
      id: doc.id,
      serviceOrderId: doc.serviceOrderId,
      serviceOrderNumber: doc.serviceOrderNumber,
      customerId: doc.customerId,
      customerEmail: doc.customerEmail,
      description: doc.description,
      amount: doc.amount,
      status: doc.status as 'pending' | 'approved' | 'rejected',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findByServiceOrderId(serviceOrderId: string): Promise<Quotation | null> {
    const doc = await QuotationModel.findOne({ serviceOrderId });
    if (!doc) return null;
    return new Quotation({
      id: doc.id,
      serviceOrderId: doc.serviceOrderId,
      serviceOrderNumber: doc.serviceOrderNumber,
      customerId: doc.customerId,
      customerEmail: doc.customerEmail,
      description: doc.description,
      amount: doc.amount,
      status: doc.status as 'pending' | 'approved' | 'rejected',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async update(quotation: Quotation): Promise<void> {
    await QuotationModel.updateOne(
      { id: quotation.id },
      {
        status: quotation.status,
        updatedAt: quotation.updatedAt,
      },
    );
  }
}

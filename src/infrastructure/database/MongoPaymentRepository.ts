import { Payment } from '../../domain/entities/Payment';
import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { PaymentModel } from './schemas/PaymentSchema';

export class MongoPaymentRepository implements IPaymentRepository {
  async save(payment: Payment): Promise<void> {
    await PaymentModel.create({
      id: payment.id,
      quotationId: payment.quotationId,
      serviceOrderId: payment.serviceOrderId,
      customerId: payment.customerId,
      amount: payment.amount,
      mercadoPagoPaymentId: payment.mercadoPagoPaymentId,
      mercadoPagoPreferenceId: payment.mercadoPagoPreferenceId,
      mercadoPagoPayload: payment.mercadoPagoPayload,
      status: payment.status,
    });
  }

  async findById(id: string): Promise<Payment | null> {
    const doc = await PaymentModel.findOne({ id });
    if (!doc) return null;
    return new Payment({
      id: doc.id,
      quotationId: doc.quotationId,
      serviceOrderId: doc.serviceOrderId,
      customerId: doc.customerId,
      amount: doc.amount,
      mercadoPagoPaymentId: doc.mercadoPagoPaymentId,
      mercadoPagoPreferenceId: doc.mercadoPagoPreferenceId,
      mercadoPagoPayload: doc.mercadoPagoPayload,
      status: doc.status as 'pending' | 'approved' | 'failed' | 'cancelled',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findByQuotationId(quotationId: string): Promise<Payment | null> {
    const doc = await PaymentModel.findOne({ quotationId });
    if (!doc) return null;
    return new Payment({
      id: doc.id,
      quotationId: doc.quotationId,
      serviceOrderId: doc.serviceOrderId,
      customerId: doc.customerId,
      amount: doc.amount,
      mercadoPagoPaymentId: doc.mercadoPagoPaymentId,
      mercadoPagoPreferenceId: doc.mercadoPagoPreferenceId,
      mercadoPagoPayload: doc.mercadoPagoPayload,
      status: doc.status as 'pending' | 'approved' | 'failed' | 'cancelled',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findByMercadoPagoPaymentId(mercadoPagoPaymentId: string): Promise<Payment | null> {
    const doc = await PaymentModel.findOne({ mercadoPagoPaymentId });
    if (!doc) return null;
    return new Payment({
      id: doc.id,
      quotationId: doc.quotationId,
      serviceOrderId: doc.serviceOrderId,
      customerId: doc.customerId,
      amount: doc.amount,
      mercadoPagoPaymentId: doc.mercadoPagoPaymentId,
      mercadoPagoPreferenceId: doc.mercadoPagoPreferenceId,
      mercadoPagoPayload: doc.mercadoPagoPayload,
      status: doc.status as 'pending' | 'approved' | 'failed' | 'cancelled',
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async update(payment: Payment): Promise<void> {
    await PaymentModel.updateOne(
      { id: payment.id },
      {
        mercadoPagoPaymentId: payment.mercadoPagoPaymentId,
        mercadoPagoPayload: payment.mercadoPagoPayload,
        status: payment.status,
        updatedAt: payment.updatedAt,
      },
    );
  }
}

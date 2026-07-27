import { Payment } from '../../domain/entities/Payment';
import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { PendingEvent } from '../../domain/events/PendingEvent';
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

  async atomicUpdateWithEvent(
    id: string,
    fields: Record<string, unknown>,
    event: PendingEvent,
  ): Promise<void> {
    await PaymentModel.findOneAndUpdate(
      { id },
      {
        $set: fields,
        $push: { pendingEvents: event },
      },
    );
  }

  async findWithPendingEvents(): Promise<Array<{ entityId: string; pendingEvents: PendingEvent[] }>> {
    const docs = await PaymentModel.find({ 'pendingEvents.0': { $exists: true } });
    return docs.map((doc) => ({
      entityId: doc.id,
      pendingEvents: doc.pendingEvents ?? [],
    }));
  }

  async clearPendingEvent(entityId: string, eventId: string): Promise<void> {
    await PaymentModel.findOneAndUpdate(
      { id: entityId },
      { $pull: { pendingEvents: { id: eventId } } },
    );
  }
}

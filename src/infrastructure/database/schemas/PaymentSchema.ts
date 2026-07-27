import mongoose, { Schema, Document } from 'mongoose';
import { PendingEvent } from '../../../domain/events/PendingEvent';

export interface PaymentDocument extends Document {
  id: string;
  quotationId: string;
  serviceOrderId: string;
  customerId: string;
  amount: number;
  mercadoPagoPaymentId?: string;
  mercadoPagoPreferenceId?: string;
  mercadoPagoPayload?: Record<string, unknown>;
  status: string;
  pendingEvents: PendingEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const pendingEventSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const paymentSchema = new Schema<PaymentDocument>(
  {
    id: { type: String, required: true, unique: true },
    quotationId: { type: String, required: true },
    serviceOrderId: { type: String, required: true },
    customerId: { type: String, required: true },
    amount: { type: Number, required: true },
    mercadoPagoPaymentId: { type: String },
    mercadoPagoPreferenceId: { type: String },
    mercadoPagoPayload: { type: Schema.Types.Mixed },
    status: { type: String, required: true, default: 'pending' },
    pendingEvents: { type: [pendingEventSchema], default: [] },
  },
  { timestamps: true },
);

export const PaymentModel = mongoose.model<PaymentDocument>('Payment', paymentSchema);

import mongoose, { Schema, Document } from 'mongoose';

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
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  { timestamps: true },
);

export const PaymentModel = mongoose.model<PaymentDocument>('Payment', paymentSchema);

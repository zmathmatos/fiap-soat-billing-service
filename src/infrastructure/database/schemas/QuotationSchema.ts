import mongoose, { Schema, Document } from 'mongoose';
import { PendingEvent } from '../../../domain/events/PendingEvent';

export interface QuotationDocument extends Document {
  id: string;
  serviceOrderId: string;
  serviceOrderNumber: number;
  customerId: string;
  customerEmail: string;
  description: string;
  amount: number;
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

const quotationSchema = new Schema<QuotationDocument>(
  {
    id: { type: String, required: true, unique: true },
    serviceOrderId: { type: String, required: true },
    serviceOrderNumber: { type: Number, required: true },
    customerId: { type: String, required: true },
    customerEmail: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true, default: 'pending' },
    pendingEvents: { type: [pendingEventSchema], default: [] },
  },
  { timestamps: true },
);

export const QuotationModel = mongoose.model<QuotationDocument>('Quotation', quotationSchema);

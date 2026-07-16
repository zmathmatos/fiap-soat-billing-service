import mongoose, { Schema, Document } from 'mongoose';

export interface QuotationDocument extends Document {
  id: string;
  serviceOrderId: string;
  serviceOrderNumber: number;
  customerId: string;
  customerEmail: string;
  description: string;
  amount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  { timestamps: true },
);

export const QuotationModel = mongoose.model<QuotationDocument>('Quotation', quotationSchema);

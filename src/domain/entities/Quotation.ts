import { v4 as uuidv4 } from 'uuid';

export type QuotationStatus = 'pending' | 'approved' | 'rejected';

export interface QuotationProps {
  id?: string;
  serviceOrderId: string;
  customerId: string;
  customerEmail: string;
  description: string;
  amount: number;
  status?: QuotationStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Quotation {
  readonly id: string;
  readonly serviceOrderId: string;
  readonly customerId: string;
  readonly customerEmail: string;
  readonly description: string;
  readonly amount: number;
  status: QuotationStatus;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: QuotationProps) {
    this.id = props.id || uuidv4();
    this.serviceOrderId = props.serviceOrderId;
    this.customerId = props.customerId;
    this.customerEmail = props.customerEmail;
    this.description = props.description;
    this.amount = props.amount;
    this.status = props.status || 'pending';
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  approve(): void {
    if (this.status !== 'pending') {
      throw new Error('Only pending quotations can be approved');
    }
    this.status = 'approved';
    this.updatedAt = new Date();
  }

  reject(): void {
    if (this.status !== 'pending') {
      throw new Error('Only pending quotations can be rejected');
    }
    this.status = 'rejected';
    this.updatedAt = new Date();
  }
}

import { v4 as uuidv4 } from 'uuid';

export type PaymentStatus = 'pending' | 'approved' | 'failed' | 'cancelled';

export interface PaymentProps {
  id?: string;
  quotationId: string;
  serviceOrderId: string;
  customerId: string;
  amount: number;
  mercadoPagoPaymentId?: string;
  mercadoPagoPreferenceId?: string;
  mercadoPagoPayload?: Record<string, unknown>;
  status?: PaymentStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Payment {
  readonly id: string;
  readonly quotationId: string;
  readonly serviceOrderId: string;
  readonly customerId: string;
  readonly amount: number;
  mercadoPagoPaymentId?: string;
  mercadoPagoPreferenceId?: string;
  mercadoPagoPayload?: Record<string, unknown>;
  status: PaymentStatus;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: PaymentProps) {
    this.id = props.id || uuidv4();
    this.quotationId = props.quotationId;
    this.serviceOrderId = props.serviceOrderId;
    this.customerId = props.customerId;
    this.amount = props.amount;
    this.mercadoPagoPaymentId = props.mercadoPagoPaymentId;
    this.mercadoPagoPreferenceId = props.mercadoPagoPreferenceId;
    this.mercadoPagoPayload = props.mercadoPagoPayload;
    this.status = props.status || 'pending';
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  confirm(mercadoPagoPaymentId: string, payload: Record<string, unknown>): void {
    this.mercadoPagoPaymentId = mercadoPagoPaymentId;
    this.mercadoPagoPayload = payload;
    this.status = 'approved';
    this.updatedAt = new Date();
  }

  fail(): void {
    this.status = 'failed';
    this.updatedAt = new Date();
  }
}

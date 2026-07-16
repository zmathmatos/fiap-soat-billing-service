export interface IEventPublisher {
  publishPaymentApproved(payload: Record<string, unknown>): Promise<void>;
  publishPaymentFailed(payload: Record<string, unknown>): Promise<void>;
}

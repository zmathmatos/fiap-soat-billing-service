export interface IOsServiceClient {
  updateStatusToFinished(serviceOrderId: string): Promise<void>;
}

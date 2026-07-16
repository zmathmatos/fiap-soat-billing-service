export interface IOsServiceClient {
  updateStatusToFinished(serviceOrderId: string): Promise<void>;
  updateStatusToInProgress(serviceOrderId: string): Promise<void>;
}

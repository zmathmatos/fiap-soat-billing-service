import axios from 'axios';
import { IOsServiceClient } from '../../application/services/IOsServiceClient';
import { env } from '../../shared/config/env';

export class OsServiceClient implements IOsServiceClient {
  private baseUrl = env.osServiceUrl;

  async updateStatusToFinished(serviceOrderId: string): Promise<void> {
    await axios.post(`${this.baseUrl}/service-orders/${serviceOrderId}/events`, {
      event: 'quotation.rejected',
    });
  }
}

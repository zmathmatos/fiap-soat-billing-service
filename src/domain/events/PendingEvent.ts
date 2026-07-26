export interface PendingEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

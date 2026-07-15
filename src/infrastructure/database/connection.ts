import mongoose from 'mongoose';
import { env } from '../../shared/config/env';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.mongoUri);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

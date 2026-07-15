import { createApp } from './app';
import { connectDatabase } from './shared/config/database';
import { env } from './shared/config/env';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Billing service running on port ${env.port}`);
  });
}

bootstrap().catch(console.error);

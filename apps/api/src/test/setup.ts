import { beforeEach } from 'vitest';
import { resetTestDatabase } from './db';

beforeEach(async () => {
  await resetTestDatabase();
});

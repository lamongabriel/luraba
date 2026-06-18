import { logger } from '../../shared/logger';
import { seedAll } from '.';

seedAll()
  .then(() => {
    logger.info('All seeds completed');
  })
  .catch((err) => {
    logger.error({ err }, 'Failed to seed all');
    process.exit(1);
  });

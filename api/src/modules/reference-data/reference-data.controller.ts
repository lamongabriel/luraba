import { createHandler } from '@/shared/controllers/controller';
import * as referenceDataService from './reference-data.service';
import { GetLocationOptionsResponseSchema } from './reference-data.types';

export const getLocationOptions = createHandler({
  response: GetLocationOptionsResponseSchema,
  handle: async () => referenceDataService.getLocationOptions(),
});

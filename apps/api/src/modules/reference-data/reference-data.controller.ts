import { referenceDataEndpoints } from "@luraba/contracts/reference-data";
import { createHandler } from "@/shared/controllers/controller";
import * as referenceDataService from "./reference-data.service";

export const getLocationOptions = createHandler({
  response: referenceDataEndpoints.getLocations.response,
  handle: async () => referenceDataService.getLocationOptions(),
});

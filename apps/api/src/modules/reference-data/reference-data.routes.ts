import { getEndpointRouterPath, referenceDataEndpoints } from "@luraba/contracts";
import { Router } from "express";
import * as referenceDataController from "./reference-data.controller";

const router = Router();

router.get(
  getEndpointRouterPath(referenceDataEndpoints.getLocations),
  referenceDataController.getLocationOptions,
);

export default router;

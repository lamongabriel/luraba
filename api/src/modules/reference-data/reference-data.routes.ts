import { Router } from 'express';
import * as referenceDataController from './reference-data.controller';

const router = Router();

router.get('/locations', referenceDataController.getLocationOptions);

export default router;

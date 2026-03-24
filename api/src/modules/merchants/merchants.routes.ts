import { Router } from 'express';
import * as merchantsController from './merchants.controller';

const router = Router();

router.get('/', merchantsController.list);
router.post('/', merchantsController.create);

export default router;
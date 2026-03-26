import { Router } from 'express';
import * as paymentMethodsController from './payment-methods.controller';

const router = Router();

router.get('/', paymentMethodsController.list);

export default router;

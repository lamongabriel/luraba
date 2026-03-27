import { Router } from 'express';
import * as creditCardsController from './credit-cards.controller';

const router = Router();

router.get('/', creditCardsController.list);
router.post('/', creditCardsController.create);
router.get('/:id', creditCardsController.getById);
router.patch('/:id', creditCardsController.update);
router.get('/:id/cycles', creditCardsController.listCycles);
router.get('/:id/cycles/:cycleId', creditCardsController.getCycle);
router.patch('/:id/cycles/:cycleId', creditCardsController.updateCycle);
router.post('/:id/purchases', creditCardsController.createPurchase);
router.post('/:id/payments', creditCardsController.createPayment);
router.get('/:id/forecast', creditCardsController.getForecast);

export default router;

import { Router } from 'express';
import * as creditCardsController from './credit-cards.controller';

const router = Router();

router.post('/', creditCardsController.create);
router.get('/:id/overview', creditCardsController.overview);

export default router;
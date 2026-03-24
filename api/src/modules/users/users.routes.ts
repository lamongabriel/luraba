import { Router } from 'express';
import * as usersController from './users.controller';

const router = Router();

router.get('/me/preferences', usersController.getMyPreferences);
router.patch('/me/preferences', usersController.updateMyPreferences);

router.get('/', usersController.getAll);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.patch('/:id', usersController.update);
router.delete('/:id', usersController.remove);

export default router;
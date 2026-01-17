import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { validators } from '../utils/validators';

const router = Router();

router.post('/login', validate(validators.login), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;

import { Router } from 'express';
import { memberController } from '../controllers/member.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/me', memberController.getCurrentMember);
router.get('/me/dashboard', memberController.getDashboard);

export default router;

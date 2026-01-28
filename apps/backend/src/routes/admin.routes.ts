import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { validators } from '../utils/validators';

const router = Router();

// すべてのルートで認証が必要、かつadminまたはmanager権限が必要
router.use(authMiddleware);
router.use((req: any, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'アクセス権限がありません',
      },
    });
  }
  next();
});

router.get('/members-with-applications', adminController.getMembersWithApplications);
router.get('/expense-applications', adminController.getApplications);
router.get('/expense-applications/:id', adminController.getApplicationById);
router.post('/expense-applications/:id/approve', validate(validators.approval), adminController.approve);
router.post('/expense-applications/:id/reject', validate(validators.rejection), adminController.reject);
router.post('/expense-applications/:id/cancel', validate(validators.rejection), adminController.cancel);
router.get('/payments', adminController.getPaymentTargets);
router.post('/payments/generate', adminController.generatePaymentData);

export default router;

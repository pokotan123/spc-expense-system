import { Router } from 'express';
import { expenseApplicationController } from '../controllers/expense-application.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { validators } from '../utils/validators';

const router = Router();

// すべてのルートで認証が必要
router.use(authMiddleware);

router.get('/', expenseApplicationController.getList);
router.get('/:id', expenseApplicationController.getById);
router.post('/', validate(validators.expenseApplicationCreate), expenseApplicationController.create);
router.put('/:id', validate(validators.expenseApplicationUpdate), expenseApplicationController.update);
router.delete('/:id', expenseApplicationController.delete);
router.post('/:id/submit', expenseApplicationController.submit);

export default router;

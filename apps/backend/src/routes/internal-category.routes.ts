import { Router } from 'express';
import { internalCategoryController } from '../controllers/internal-category.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { validators } from '../utils/validators';

const router = Router();

// すべてのルートで認証が必要
router.use(authMiddleware);

// 一覧取得は全員がアクセス可能
router.get('/', internalCategoryController.getList);

// 作成・更新・削除はadminまたはmanagerのみ
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

router.post('/', validate(validators.internalCategoryCreate), internalCategoryController.create);
router.put('/:id', validate(validators.internalCategoryUpdate), internalCategoryController.update);
router.delete('/:id', internalCategoryController.delete);

export default router;

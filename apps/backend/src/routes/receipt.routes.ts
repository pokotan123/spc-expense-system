import { Router } from 'express';
import { receiptController } from '../controllers/receipt.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';

const router = Router();

// ファイルアップロード設定
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('許可されていないファイル形式です'));
    }
  },
});

router.use(authMiddleware);

router.post('/', upload.single('file'), receiptController.upload);
router.get('/:id', receiptController.getById);
router.delete('/:id', receiptController.delete);
router.post('/:id/ocr', receiptController.executeOCR);
router.put('/:id/ocr/update', receiptController.updateOCRResult);

export default router;

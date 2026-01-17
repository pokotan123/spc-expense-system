import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { ocrService } from '../services/ocr.service';
import { fileStorageService } from '../services/file-storage.service';

export const receiptController = {
  upload: async (req: AuthRequest, res: Response) => {
    try {
      const file = (req as any).file;
      const { expenseApplicationId } = req.body;

      if (!file) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ファイルがアップロードされていません',
          },
        });
      }

      if (!expenseApplicationId) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '申請IDが必要です',
          },
        });
      }

      // 申請の存在確認と権限チェック
      const application = await prisma.expenseApplication.findUnique({
        where: { id: Number(expenseApplicationId) },
      });

      if (!application) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
          },
        });
      }

      if (req.user!.role === 'member' && application.memberId !== req.user!.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
          },
        });
      }

      // ファイルをストレージにアップロード
      const fileUrl = await fileStorageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        Number(expenseApplicationId)
      );

      // データベースに保存
      const receipt = await prisma.receipt.create({
        data: {
          expenseApplicationId: Number(expenseApplicationId),
          fileName: file.originalname,
          filePath: fileUrl,
          fileUrl,
          fileSize: BigInt(file.size),
          mimeType: file.mimetype,
        },
      });

      res.status(201).json({
        ...receipt,
        fileSize: receipt.fileSize.toString(),
        createdAt: receipt.createdAt.toISOString(),
        updatedAt: receipt.updatedAt.toISOString(),
      });
    } catch (error: any) {
      console.error('Upload receipt error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '領収書のアップロードに失敗しました',
        },
      });
    }
  },

  getById: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const receipt = await prisma.receipt.findUnique({
        where: { id: Number(id) },
        include: {
          expenseApplication: {
            include: { member: true },
          },
          ocrResult: true,
        },
      });

      if (!receipt) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '領収書が見つかりません',
          },
        });
      }

      // 権限チェック
      if (req.user!.role === 'member' && receipt.expenseApplication.memberId !== req.user!.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
          },
        });
      }

      res.json({
        ...receipt,
        fileSize: receipt.fileSize.toString(),
        createdAt: receipt.createdAt.toISOString(),
        updatedAt: receipt.updatedAt.toISOString(),
      });
    } catch (error: any) {
      console.error('Get receipt error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '領収書の取得に失敗しました',
        },
      });
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const receipt = await prisma.receipt.findUnique({
        where: { id: Number(id) },
        include: { expenseApplication: true },
      });

      if (!receipt) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '領収書が見つかりません',
          },
        });
      }

      // 権限チェック
      if (req.user!.role === 'member' && receipt.expenseApplication.memberId !== req.user!.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
          },
        });
      }

      // ファイルをストレージから削除
      await fileStorageService.deleteFile(receipt.filePath);

      // データベースから削除（CASCADEでOCR結果も削除される）
      await prisma.receipt.delete({
        where: { id: Number(id) },
      });

      res.status(204).send();
    } catch (error: any) {
      console.error('Delete receipt error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '領収書の削除に失敗しました',
        },
      });
    }
  },

  executeOCR: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const receipt = await prisma.receipt.findUnique({
        where: { id: Number(id) },
        include: {
          expenseApplication: {
            include: { member: true },
          },
        },
      });

      if (!receipt) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '領収書が見つかりません',
          },
        });
      }

      // 権限チェック
      if (req.user!.role === 'member' && receipt.expenseApplication.memberId !== req.user!.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
          },
        });
      }

      // OCR実行
      const ocrResult = await ocrService.processReceipt(receipt.fileUrl);

      // OCR結果を保存
      const savedResult = await prisma.oCRResult.upsert({
        where: { receiptId: Number(id) },
        create: {
          receiptId: Number(id),
          extractedDate: ocrResult.extractedDate ? new Date(ocrResult.extractedDate) : null,
          extractedAmount: ocrResult.extractedAmount || null,
          extractedStoreName: ocrResult.extractedStoreName || null,
          extractedText: ocrResult.extractedText || null,
          confidence: ocrResult.confidence || null,
          status: 'completed',
          completedAt: new Date(),
        },
        update: {
          extractedDate: ocrResult.extractedDate ? new Date(ocrResult.extractedDate) : null,
          extractedAmount: ocrResult.extractedAmount || null,
          extractedStoreName: ocrResult.extractedStoreName || null,
          extractedText: ocrResult.extractedText || null,
          confidence: ocrResult.confidence || null,
          status: 'completed',
          completedAt: new Date(),
        },
      });

      res.json({
        ...savedResult,
        extractedDate: savedResult.extractedDate?.toISOString().split('T')[0],
        createdAt: savedResult.createdAt.toISOString(),
        updatedAt: savedResult.updatedAt.toISOString(),
        completedAt: savedResult.completedAt?.toISOString(),
      });
    } catch (error: any) {
      console.error('Execute OCR error:', error);

      // OCR失敗時も結果を保存
      await prisma.oCRResult.upsert({
        where: { receiptId: Number(req.params.id) },
        create: {
          receiptId: Number(req.params.id),
          status: 'failed',
        },
        update: {
          status: 'failed',
        },
      });

      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OCR処理に失敗しました',
        },
      });
    }
  },

  updateOCRResult: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { extractedDate, extractedAmount, extractedStoreName } = req.body;

      const receipt = await prisma.receipt.findUnique({
        where: { id: Number(id) },
        include: {
          expenseApplication: {
            include: { member: true },
          },
        },
      });

      if (!receipt) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '領収書が見つかりません',
          },
        });
      }

      // 権限チェック
      if (req.user!.role === 'member' && receipt.expenseApplication.memberId !== req.user!.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
          },
        });
      }

      const updated = await prisma.oCRResult.update({
        where: { receiptId: Number(id) },
        data: {
          ...(extractedDate && { extractedDate: new Date(extractedDate) }),
          ...(extractedAmount !== undefined && { extractedAmount: Number(extractedAmount) }),
          ...(extractedStoreName !== undefined && { extractedStoreName }),
        },
      });

      res.json({
        ...updated,
        extractedDate: updated.extractedDate?.toISOString().split('T')[0],
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        completedAt: updated.completedAt?.toISOString(),
      });
    } catch (error: any) {
      console.error('Update OCR result error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OCR結果の更新に失敗しました',
        },
      });
    }
  },
};

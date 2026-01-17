import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { subsidyCalculationService } from '../services/subsidy-calculation.service';

export const expenseApplicationController = {
  getList: async (req: AuthRequest, res: Response) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const memberId = req.user!.id;

      const where: any = {};

      // 会員の場合は自分の申請のみ
      if (req.user!.role === 'member') {
        where.memberId = memberId;
      }

      // ステータスフィルタ
      if (status) {
        where.status = status;
      }

      const [items, total] = await Promise.all([
        prisma.expenseApplication.findMany({
          where,
          include: {
            member: {
              include: { department: true },
            },
            internalCategory: true,
            receipts: {
              include: { ocrResult: true },
            },
            comments: {
              include: { member: true },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.expenseApplication.count({ where }),
      ]);

      res.json({
        items: items.map((item) => ({
          ...item,
          expenseDate: item.expenseDate.toISOString().split('T')[0],
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          submittedAt: item.submittedAt?.toISOString(),
          approvedAt: item.approvedAt?.toISOString(),
          rejectedAt: item.rejectedAt?.toISOString(),
        })),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error: any) {
      console.error('Get list error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '申請一覧の取得に失敗しました',
        },
      });
    }
  },

  getById: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const application = await prisma.expenseApplication.findUnique({
        where: { id: Number(id) },
        include: {
          member: {
            include: { department: true },
          },
          internalCategory: true,
          receipts: {
            include: { ocrResult: true },
          },
          comments: {
            include: { member: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!application) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
          },
        });
      }

      // 会員の場合は自分の申請のみ
      if (req.user!.role === 'member' && application.memberId !== req.user!.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
          },
        });
      }

      res.json({
        ...application,
        expenseDate: application.expenseDate.toISOString().split('T')[0],
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
        submittedAt: application.submittedAt?.toISOString(),
        approvedAt: application.approvedAt?.toISOString(),
        rejectedAt: application.rejectedAt?.toISOString(),
      });
    } catch (error: any) {
      console.error('Get by id error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '申請の取得に失敗しました',
        },
      });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    try {
      const { expenseDate, amount, description } = req.body;

      if (!expenseDate || !amount || !description) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '必須項目が不足しています',
          },
        });
      }

      const newApplication = await prisma.expenseApplication.create({
        data: {
          memberId: req.user!.id,
          status: 'draft',
          expenseDate: new Date(expenseDate),
          amount: Number(amount),
          description,
          isCashPayment: false,
        },
        include: {
          member: {
            include: { department: true },
          },
        },
      });

      res.status(201).json({
        ...newApplication,
        expenseDate: newApplication.expenseDate.toISOString().split('T')[0],
        createdAt: newApplication.createdAt.toISOString(),
        updatedAt: newApplication.updatedAt.toISOString(),
      });
    } catch (error: any) {
      console.error('Create error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '申請の作成に失敗しました',
        },
      });
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { expenseDate, amount, description } = req.body;

      const application = await prisma.expenseApplication.findUnique({
        where: { id: Number(id) },
      });

      if (!application || application.memberId !== req.user!.id) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
          },
        });
      }

      if (application.status !== 'draft' && application.status !== 'returned') {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: '編集可能な状態ではありません',
          },
        });
      }

      const updated = await prisma.expenseApplication.update({
        where: { id: Number(id) },
        data: {
          ...(expenseDate && { expenseDate: new Date(expenseDate) }),
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(description && { description }),
        },
        include: {
          member: {
            include: { department: true },
          },
          internalCategory: true,
        },
      });

      res.json({
        ...updated,
        expenseDate: updated.expenseDate.toISOString().split('T')[0],
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (error: any) {
      console.error('Update error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '申請の更新に失敗しました',
        },
      });
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const application = await prisma.expenseApplication.findUnique({
        where: { id: Number(id) },
      });

      if (!application || application.memberId !== req.user!.id) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
          },
        });
      }

      if (application.status !== 'draft') {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: '削除可能な状態ではありません',
          },
        });
      }

      await prisma.expenseApplication.delete({
        where: { id: Number(id) },
      });

      res.status(204).send();
    } catch (error: any) {
      console.error('Delete error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '申請の削除に失敗しました',
        },
      });
    }
  },

  submit: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const application = await prisma.expenseApplication.findUnique({
        where: { id: Number(id) },
        include: { receipts: true },
      });

      if (!application || application.memberId !== req.user!.id) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
          },
        });
      }

      if (application.status !== 'draft' && application.status !== 'returned') {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: '送信可能な状態ではありません',
          },
        });
      }

      const updated = await prisma.expenseApplication.update({
        where: { id: Number(id) },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
        },
        include: {
          member: {
            include: { department: true },
          },
          internalCategory: true,
        },
      });

      res.json({
        ...updated,
        expenseDate: updated.expenseDate.toISOString().split('T')[0],
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        submittedAt: updated.submittedAt?.toISOString(),
      });
    } catch (error: any) {
      console.error('Submit error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '申請の送信に失敗しました',
        },
      });
    }
  },
};

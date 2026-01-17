import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';

export const internalCategoryController = {
  getList: async (req: AuthRequest, res: Response) => {
    try {
      const { isActive } = req.query;

      const where: any = {};
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const categories = await prisma.internalCategory.findMany({
        where,
        orderBy: { code: 'asc' },
      });

      res.json(
        categories.map((cat) => ({
          ...cat,
          createdAt: cat.createdAt.toISOString(),
          updatedAt: cat.updatedAt.toISOString(),
        }))
      );
    } catch (error: any) {
      console.error('Get categories error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '社内カテゴリ一覧の取得に失敗しました',
        },
      });
    }
  },

  create: async (req: AuthRequest, res: Response) => {
    try {
      const { name, code, description } = req.body;

      if (!name || !code) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'カテゴリ名とコードは必須です',
          },
        });
      }

      const category = await prisma.internalCategory.create({
        data: {
          name,
          code,
          description,
          isActive: true,
        },
      });

      res.status(201).json({
        ...category,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      });
    } catch (error: any) {
      console.error('Create category error:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({
          error: {
            code: 'DUPLICATE_ERROR',
            message: 'このコードは既に使用されています',
          },
        });
      }
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '社内カテゴリの作成に失敗しました',
        },
      });
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, code, description, isActive } = req.body;

      const category = await prisma.internalCategory.update({
        where: { id: Number(id) },
        data: {
          ...(name && { name }),
          ...(code && { code }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        ...category,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      });
    } catch (error: any) {
      console.error('Update category error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '社内カテゴリが見つかりません',
          },
        });
      }
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '社内カテゴリの更新に失敗しました',
        },
      });
    }
  },

  delete: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // 使用中のカテゴリは削除できない
      const usageCount = await prisma.expenseApplication.count({
        where: { internalCategoryId: Number(id) },
      });

      if (usageCount > 0) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: '使用中のカテゴリは削除できません。無効化してください。',
          },
        });
      }

      await prisma.internalCategory.delete({
        where: { id: Number(id) },
      });

      res.status(204).send();
    } catch (error: any) {
      console.error('Delete category error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '社内カテゴリが見つかりません',
          },
        });
      }
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '社内カテゴリの削除に失敗しました',
        },
      });
    }
  },
};

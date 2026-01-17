import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';

export const memberController = {
  getCurrentMember: async (req: AuthRequest, res: Response) => {
    try {
      const member = await prisma.member.findUnique({
        where: { id: req.user!.id },
        include: { department: true },
      });

      if (!member) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '会員情報が見つかりません',
          },
        });
      }

      res.json({
        ...member,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
        lastLoginAt: member.lastLoginAt?.toISOString(),
      });
    } catch (error: any) {
      console.error('Get current member error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '会員情報の取得に失敗しました',
        },
      });
    }
  },

  getDashboard: async (req: AuthRequest, res: Response) => {
    try {
      const memberId = req.user!.id;

      const [total, pending, approved, returned, totalAmountResult] = await Promise.all([
        prisma.expenseApplication.count({
          where: { memberId },
        }),
        prisma.expenseApplication.count({
          where: { memberId, status: 'submitted' },
        }),
        prisma.expenseApplication.count({
          where: { memberId, status: 'approved' },
        }),
        prisma.expenseApplication.count({
          where: { memberId, status: 'returned' },
        }),
        prisma.expenseApplication.aggregate({
          where: { memberId },
          _sum: { amount: true },
        }),
      ]);

      res.json({
        totalApplications: total,
        pendingApplications: pending,
        approvedApplications: approved,
        returnedApplications: returned,
        totalAmount: totalAmountResult._sum.amount?.toNumber() || 0,
      });
    } catch (error: any) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ダッシュボード情報の取得に失敗しました',
        },
      });
    }
  },
};

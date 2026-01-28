import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { subsidyCalculationService } from '../services/subsidy-calculation.service';
import { mockStorageService } from '../services/mock-storage.service';

export const adminController = {
  getApplications: async (req: AuthRequest, res: Response) => {
    try {
      const {
        status,
        memberId,
        departmentId,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = req.query;

      const where: any = {};

      // 事務局向け申請一覧では下書き状態の申請は表示しない
      if (status) {
        where.status = status;
      } else {
        // statusが指定されていない場合（すべて）は下書きを除外
        where.status = { not: 'draft' };
      }

      if (memberId) {
        where.memberId = Number(memberId);
      }

      if (departmentId) {
        where.member = { departmentId: Number(departmentId) };
      }

      if (startDate || endDate) {
        where.expenseDate = {};
        if (startDate) {
          where.expenseDate.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.expenseDate.lte = new Date(endDate as string);
        }
      }

      let items: any[];
      let total: number;

      try {
        const [dbItems, dbTotal] = await Promise.all([
          prisma.expenseApplication.findMany({
            where,
            include: {
              member: {
                include: { department: true },
              },
              internalCategory: true,
              receipts: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
          }),
          prisma.expenseApplication.count({ where }),
        ]);
        items = dbItems;
        total = dbTotal;
      } catch (dbError: any) {
        // データベース接続エラーの場合、モックストレージから取得
        console.warn('Database connection error, using mock storage:', dbError.message);
        let mockApps = mockStorageService.getAllApplications(status as string);
        
        // 事務局向け申請一覧では下書き状態の申請は表示しない
        if (!status) {
          mockApps = mockApps.filter(app => app.status !== 'draft');
        }
        
        total = mockApps.length;
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedApps = mockApps.slice(startIndex, endIndex);

        items = paginatedApps.map((app) => ({
          ...app,
          member: {
            id: app.memberId,
            memberId: 'TEST001',
            name: 'テスト会員',
            email: 'test@example.com',
            departmentId: 1,
            department: {
              id: 1,
              name: '総務部',
              code: 'DEPT001',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            role: 'member',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
          receipts: app.receipts || [],
          internalCategory: null,
        }));
      }

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
      console.error('Get applications error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '申請一覧の取得に失敗しました',
        },
      });
    }
  },

  getApplicationById: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      let application: any;

      try {
        application = await prisma.expenseApplication.findUnique({
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
      } catch (dbError: any) {
        // データベース接続エラーの場合、モックストレージから取得
        console.warn('Database connection error, using mock storage:', dbError.message);
      }

      // データベースから取得できなかった場合、モックストレージから取得
      if (!application) {
        const mockApp = mockStorageService.getApplicationById(Number(id));
        if (mockApp) {
          application = {
            ...mockApp,
            member: {
              id: mockApp.memberId,
              memberId: 'TEST001',
              name: 'テスト会員',
              email: 'test@example.com',
              departmentId: 1,
              department: {
                id: 1,
                name: '総務部',
                code: 'DEPT001',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              role: 'member',
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLoginAt: null,
            },
            receipts: mockApp.receipts || [],
            comments: mockApp.comments || [],
            internalCategory: null,
          };
        }
      }

      if (!application) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
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
        canApprove: application.status === 'submitted',
        canReject: application.status === 'submitted',
      });
    } catch (error: any) {
      console.error('Get application by id error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '申請の取得に失敗しました',
        },
      });
    }
  },

  approve: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { internalCategoryId, finalAmount, comment } = req.body;

      if (!internalCategoryId || finalAmount === undefined) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '社内カテゴリと確定金額は必須です',
          },
        });
      }

      let application: any;

      try {
        application = await prisma.expenseApplication.findUnique({
          where: { id: Number(id) },
        });
      } catch (dbError: any) {
        // データベース接続エラーの場合、モックストレージから取得
        console.warn('Database connection error, using mock storage:', dbError.message);
        application = mockStorageService.getApplicationById(Number(id));
      }

      if (!application) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
          },
        });
      }

      if (application.status !== 'submitted') {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: '承認可能な状態ではありません',
          },
        });
      }

      let result: any;

      try {
        // 補助金額を再算出（提案額として）
        const calculationResult = await subsidyCalculationService.recalculateOnApproval(
          Number(id),
          Number(internalCategoryId)
        );

        // トランザクションで承認とコメントを同時に作成
        result = await prisma.$transaction(async (tx: any) => {
          const updated = await tx.expenseApplication.update({
            where: { id: Number(id) },
            data: {
              status: 'approved',
              internalCategoryId: Number(internalCategoryId),
              proposedAmount: calculationResult,
              finalAmount: Number(finalAmount),
              approvedAt: new Date(),
            },
            include: {
              member: {
                include: { department: true },
              },
              internalCategory: true,
            },
          });

          // コメントがある場合は作成
          if (comment) {
            await tx.applicationComment.create({
              data: {
                expenseApplicationId: Number(id),
                memberId: req.user!.id,
                comment,
                commentType: 'approval',
              },
            });
          }

          return updated;
        });
      } catch (dbError: any) {
        // データベース接続エラーの場合、モックストレージを更新
        console.warn('Database connection error, using mock storage:', dbError.message);
        const calculationResult = 0; // モックでは補助金額計算をスキップ
        
        const mockApp = mockStorageService.updateApplication(Number(id), {
          status: 'approved',
          internalCategoryId: Number(internalCategoryId),
          proposedAmount: calculationResult,
          finalAmount: Number(finalAmount),
          approvedAt: new Date(),
        });

        if (!mockApp) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: '申請が見つかりません',
            },
          });
        }

        // コメントを追加
        const comments = [];
        if (comment) {
          const savedComment = mockStorageService.addComment(
            Number(id),
            req.user!.id,
            comment,
            'approval'
          );
          comments.push(savedComment);
        }
        
        result = {
          ...mockApp,
          member: {
            id: mockApp.memberId,
            memberId: 'TEST001',
            name: 'テスト会員',
            email: 'test@example.com',
            departmentId: 1,
            department: {
              id: 1,
              name: '総務部',
              code: 'DEPT001',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            role: 'member',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
          internalCategory: null,
          comments,
        };
      }

      res.json({
        ...result,
        expenseDate: result.expenseDate.toISOString().split('T')[0],
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        approvedAt: result.approvedAt?.toISOString(),
      });
    } catch (error: any) {
      console.error('Approve error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '承認に失敗しました',
        },
      });
    }
  },

  reject: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '差戻し理由は必須です',
          },
        });
      }

      let application: any;

      try {
        application = await prisma.expenseApplication.findUnique({
          where: { id: Number(id) },
        });
      } catch (dbError: any) {
        // データベース接続エラーの場合、モックストレージから取得
        console.warn('Database connection error, using mock storage:', dbError.message);
        application = mockStorageService.getApplicationById(Number(id));
      }

      if (!application) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
          },
        });
      }

      if (application.status !== 'submitted') {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: '差戻し可能な状態ではありません',
          },
        });
      }

      let result: any;

      try {
        // トランザクションで差戻しとコメントを同時に作成
        result = await prisma.$transaction(async (tx: any) => {
          const updated = await tx.expenseApplication.update({
            where: { id: Number(id) },
            data: {
              status: 'returned',
            },
            include: {
              member: {
                include: { department: true },
              },
              internalCategory: true,
            },
          });

          await tx.applicationComment.create({
            data: {
              expenseApplicationId: Number(id),
              memberId: req.user!.id,
              comment,
              commentType: 'return',
            },
          });

          return updated;
        });
      } catch (dbError: any) {
        // データベース接続エラーの場合、モックストレージを更新
        console.warn('Database connection error, using mock storage:', dbError.message);
        const mockApp = mockStorageService.updateApplication(Number(id), {
          status: 'returned',
        });

        if (!mockApp) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: '申請が見つかりません',
            },
          });
        }

        // コメントを追加
        const savedComment = mockStorageService.addComment(
          Number(id),
          req.user!.id,
          comment,
          'return'
        );
        
        result = {
          ...mockApp,
          member: {
            id: mockApp.memberId,
            memberId: 'TEST001',
            name: 'テスト会員',
            email: 'test@example.com',
            departmentId: 1,
            department: {
              id: 1,
              name: '総務部',
              code: 'DEPT001',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            role: 'member',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
          internalCategory: null,
          comments: [savedComment],
        };
      }

      res.json({
        ...result,
        expenseDate: result.expenseDate.toISOString().split('T')[0],
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      });
    } catch (error: any) {
      console.error('Reject error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '差戻しに失敗しました',
        },
      });
    }
  },

  cancel: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '却下理由は必須です',
          },
        });
      }

      let application: any;

      try {
        application = await prisma.expenseApplication.findUnique({
          where: { id: Number(id) },
        });
      } catch (dbError: any) {
        // データベース接続エラーの場合、モックストレージから取得
        console.warn('Database connection error, using mock storage:', dbError.message);
        application = mockStorageService.getApplicationById(Number(id));
      }

      if (!application) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
          },
        });
      }

      if (application.status !== 'submitted') {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: '却下可能な状態ではありません',
          },
        });
      }

      let result: any;

      try {
        // トランザクションで却下とコメントを同時に作成
        result = await prisma.$transaction(async (tx: any) => {
          const updated = await tx.expenseApplication.update({
            where: { id: Number(id) },
            data: {
              status: 'rejected',
              rejectedAt: new Date(),
            },
            include: {
              member: {
                include: { department: true },
              },
              internalCategory: true,
            },
          });

          await tx.applicationComment.create({
            data: {
              expenseApplicationId: Number(id),
              memberId: req.user!.id,
              comment,
              commentType: 'rejection',
            },
          });

          return updated;
        });
      } catch (dbError: any) {
        // データベース接続エラーの場合、モックストレージを更新
        console.warn('Database connection error, using mock storage:', dbError.message);
        const mockApp = mockStorageService.updateApplication(Number(id), {
          status: 'rejected',
          rejectedAt: new Date(),
        });

        if (!mockApp) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: '申請が見つかりません',
            },
          });
        }

        // コメントを追加
        const savedComment = mockStorageService.addComment(
          Number(id),
          req.user!.id,
          comment,
          'rejection'
        );
        
        result = {
          ...mockApp,
          member: {
            id: mockApp.memberId,
            memberId: 'TEST001',
            name: 'テスト会員',
            email: 'test@example.com',
            departmentId: 1,
            department: {
              id: 1,
              name: '総務部',
              code: 'DEPT001',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            role: 'member',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
          internalCategory: null,
          comments: [savedComment],
        };
      }

      res.json({
        ...result,
        expenseDate: result.expenseDate.toISOString().split('T')[0],
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        rejectedAt: result.rejectedAt?.toISOString(),
      });
    } catch (error: any) {
      console.error('Cancel error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '却下に失敗しました',
        },
      });
    }
  },

  getPaymentTargets: async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, includePaid = false } = req.query;

      const where: any = {
        status: 'approved',
        finalAmount: { not: null },
      };

      if (startDate || endDate) {
        where.approvedAt = {};
        if (startDate) {
          where.approvedAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.approvedAt.lte = new Date(endDate as string);
        }
      }

      if (!includePaid) {
        where.payment = null;
      }

      const applications = await prisma.expenseApplication.findMany({
        where,
        include: {
          member: {
            include: { department: true },
          },
          payment: true,
        },
        orderBy: { approvedAt: 'desc' },
      });

      const totalAmount = applications.reduce(
        (sum: number, app: any) => sum + (app.finalAmount?.toNumber() || 0),
        0
      );

      res.json({
        items: applications.map((app: any) => ({
          expenseApplicationId: app.id,
          memberId: app.memberId,
          member: app.member,
          amount: app.finalAmount?.toNumber() || 0,
          expenseDate: app.expenseDate.toISOString().split('T')[0],
          isCashPayment: app.isCashPayment,
        })),
        total: applications.length,
        totalAmount,
      });
    } catch (error: any) {
      console.error('Get payment targets error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '振込対象の取得に失敗しました',
        },
      });
    }
  },

  generatePaymentData: async (req: AuthRequest, res: Response) => {
    try {
      const { expenseApplicationIds } = req.body;

      if (!expenseApplicationIds || !Array.isArray(expenseApplicationIds) || expenseApplicationIds.length === 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '申請IDリストが必要です',
          },
        });
      }

      const applications = await prisma.expenseApplication.findMany({
        where: {
          id: { in: expenseApplicationIds.map(Number) },
          status: 'approved',
          finalAmount: { not: null },
        },
        include: {
          member: true,
        },
      });

      if (applications.length === 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '振込対象の申請が見つかりません',
          },
        });
      }

      // CSV形式で振込データを生成
      const csvLines = applications.map((app: any) => {
        const amount = app.finalAmount?.toNumber() || 0;
        // 銀行フォーマット（簡易版）
        return `${app.member.name},${amount},${app.expenseDate.toISOString().split('T')[0]}`;
      });

      const csvData = ['申請者名,金額,経費発生日', ...csvLines].join('\n');

      const totalAmount = applications.reduce(
        (sum: number, app: any) => sum + (app.finalAmount?.toNumber() || 0),
        0
      );

      // 振込情報を保存
      await prisma.$transaction(
        applications.map((app: any) =>
          prisma.payment.upsert({
            where: { expenseApplicationId: app.id },
            create: {
              expenseApplicationId: app.id,
              paymentStatus: 'pending',
              bankData: {
                amount: app.finalAmount?.toNumber(),
                memberName: app.member.name,
              },
            },
            update: {
              bankData: {
                amount: app.finalAmount?.toNumber(),
                memberName: app.member.name,
              },
            },
          })
        )
      );

      res.json({
        format: 'csv',
        data: csvData,
        fileName: `payment-${new Date().toISOString().split('T')[0]}.csv`,
        totalAmount,
        totalCount: applications.length,
      });
    } catch (error: any) {
      console.error('Generate payment data error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '振込データの生成に失敗しました',
        },
      });
    }
  },
};

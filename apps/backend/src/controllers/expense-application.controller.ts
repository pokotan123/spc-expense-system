import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { subsidyCalculationService } from '../services/subsidy-calculation.service';
import { mockStorageService } from '../services/mock-storage.service';
import { dbHealthChecker } from '../utils/db-health';

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

      let items: any[];
      let total: number;

      // データベース接続を確認（キャッシュ付き）
      const isDbConnected = await dbHealthChecker.checkConnection();

      if (!isDbConnected) {
        // モックストレージから取得
        const mockApps = req.user!.role === 'member'
          ? mockStorageService.getApplicationsByMemberId(memberId, status as string)
          : mockStorageService.getAllApplications(status as string);
        
        total = mockApps.length;
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedApps = mockApps.slice(startIndex, endIndex);

        items = paginatedApps.map((app) => ({
          ...app,
          member: {
            id: app.memberId,
            memberId: req.user!.memberId,
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
            role: req.user!.role,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
          receipts: app.receipts || [],
          comments: app.comments || [],
          internalCategory: null,
        }));
      } else {
        const [dbItems, dbTotal] = await Promise.all([
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
        items = dbItems;
        total = dbTotal;
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
      let application;
      let usingMock = false;

      // データベース接続を確認（キャッシュ付き）
      const isDbConnected = await dbHealthChecker.checkConnection();

      if (!isDbConnected) {
        usingMock = true;
      } else {
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
      }

      // データベースから取得できなかった、またはDB接続がない場合、モックストレージから取得
      if (!application) {
        const mockApp = mockStorageService.getApplicationById(Number(id));
        if (mockApp) {
          application = {
            ...mockApp,
            member: {
              id: mockApp.memberId,
              memberId: req.user!.memberId,
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
              role: req.user!.role,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastLoginAt: null,
            },
            receipts: mockApp.receipts || [],
            comments: mockApp.comments || [],
            internalCategory: null,
          };
          usingMock = true;
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

      // モックモードでは会員IDチェックをスキップ
      // 会員の場合は自分の申請のみ（ただしモックモードは例外）
      if (!usingMock && req.user!.role === 'member' && application.memberId !== req.user!.id) {
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

      // データベース接続を確認（キャッシュ付き）
      const isDbConnected = await dbHealthChecker.checkConnection();

      let newApplication;
      if (!isDbConnected) {
        // モック申請データを作成
        const mockApplication = {
          id: Date.now(),
          memberId: req.user!.id,
          status: 'draft',
          expenseDate: new Date(expenseDate),
          amount: Number(amount),
          description,
          isCashPayment: false,
          proposedAmount: null,
          finalAmount: null,
          internalCategoryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          submittedAt: null,
          approvedAt: null,
          rejectedAt: null,
          member: {
            id: req.user!.id,
            memberId: req.user!.memberId,
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
            role: req.user!.role,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
          receipts: [],
          comments: [],
        };

        // モックストレージに保存
        mockStorageService.saveApplication(mockApplication);

        return res.status(201).json({
          ...mockApplication,
          expenseDate: mockApplication.expenseDate.toISOString().split('T')[0],
          createdAt: mockApplication.createdAt.toISOString(),
          updatedAt: mockApplication.updatedAt.toISOString(),
        });
      }

      newApplication = await prisma.expenseApplication.create({
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
      }

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
          message: error.message || '申請の作成に失敗しました',
        },
      });
    }
  },

  update: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { expenseDate, amount, description } = req.body;
      let application: any;
      let usingMock = false;

      // データベース接続を確認（キャッシュ付き）
      const isDbConnected = await dbHealthChecker.checkConnection();

      if (!isDbConnected) {
        application = mockStorageService.getApplicationById(Number(id));
        usingMock = true;
      } else {
        application = await prisma.expenseApplication.findUnique({
          where: { id: Number(id) },
        });
      }

      if (!application && !usingMock) {
        // DBから取得できなかった場合はモックストレージを確認
        application = mockStorageService.getApplicationById(Number(id));
        usingMock = true;
      }

      if (!application) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: '申請が見つかりません',
          },
        });
      }

      // モックモードでは会員IDチェックをスキップ
      if (!usingMock && application.memberId !== req.user!.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
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

      let updated: any;

      if (usingMock) {
        // モックストレージを更新
        const mockApp = mockStorageService.updateApplication(Number(id), {
          ...(expenseDate && { expenseDate: new Date(expenseDate) }),
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(description && { description }),
        });

        if (!mockApp) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: '申請が見つかりません',
            },
          });
        }

        updated = {
          ...mockApp,
          member: {
            id: mockApp.memberId,
            memberId: req.user!.memberId,
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
            role: req.user!.role,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
          internalCategory: null,
        };
      } else {
        updated = await prisma.expenseApplication.update({
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
      }

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
      let application: any;
      let usingMock = false;

      // データベース接続を確認（キャッシュ付き）
      const isDbConnected = await dbHealthChecker.checkConnection();

      if (!isDbConnected) {
        const mockApp = mockStorageService.getApplicationById(Number(id));
        if (mockApp) {
          application = {
            ...mockApp,
            receipts: mockApp.receipts || [],
          };
          usingMock = true;
        }
      } else {
        application = await prisma.expenseApplication.findUnique({
          where: { id: Number(id) },
          include: { receipts: true },
        });
      }

      // データベースから取得できなかった場合、モックストレージから取得
      if (!application && !usingMock) {
        const mockApp = mockStorageService.getApplicationById(Number(id));
        if (mockApp) {
          application = {
            ...mockApp,
            receipts: mockApp.receipts || [],
          };
          usingMock = true;
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

      // モックモードでは会員IDチェックをスキップ（モックは同一ユーザーの申請として扱う）
      if (!usingMock && application.memberId !== req.user!.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'アクセス権限がありません',
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

      let updated: any;

      if (usingMock) {
        // モックストレージを更新
        const mockApp = mockStorageService.updateApplication(Number(id), {
          status: 'submitted',
          submittedAt: new Date(),
        });

        if (!mockApp) {
          return res.status(404).json({
            error: {
              code: 'NOT_FOUND',
              message: '申請が見つかりません',
            },
          });
        }

        updated = {
          ...mockApp,
          member: {
            id: mockApp.memberId,
            memberId: req.user!.memberId,
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
            role: req.user!.role,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
          internalCategory: null,
        };
      }

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

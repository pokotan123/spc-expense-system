import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import prisma from '../config/database';

export const authController = {
  login: async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ユーザー名とパスワードを入力してください',
          },
        });
      }

      // SPC会員DBと連携（現在はモック）
      // TODO: 実際のSPC会員DB APIと連携
      let member;
      try {
        member = await prisma.member.findUnique({
          where: { memberId: username },
          include: { department: true },
        });
      } catch (dbError: any) {
        // データベース接続エラーの場合、モックデータを使用
        console.warn('Database connection error, using mock data:', dbError.message);
        const mockMembers = [
          {
            id: 1,
            memberId: 'member001',
            name: 'テスト会員',
            email: 'test@example.com',
            departmentId: 1,
            department: { id: 1, name: '総務部', code: 'DEPT001', isActive: true, createdAt: new Date(), updatedAt: new Date() },
            role: 'member' as const,
            passwordHash: '$2a$10$fTvc/pHnyFGX2LkBVM5sqeWxS0jYyj2sqgCl6SSpP5vh798MxQRQC', // password123
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
          {
            id: 2,
            memberId: 'admin001',
            name: 'テスト事務局',
            email: 'admin@example.com',
            departmentId: 1,
            department: { id: 1, name: '総務部', code: 'DEPT001', isActive: true, createdAt: new Date(), updatedAt: new Date() },
            role: 'admin' as const,
            passwordHash: '$2a$10$fTvc/pHnyFGX2LkBVM5sqeWxS0jYyj2sqgCl6SSpP5vh798MxQRQC', // password123
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: null,
          },
        ];
        member = mockMembers.find((m) => m.memberId === username);
      }

      if (!member) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'ユーザー名またはパスワードが正しくありません',
          },
        });
      }

      // パスワード検証
      let isPasswordValid = false;
      if ('passwordHash' in member && member.passwordHash) {
        // モックデータの場合
        isPasswordValid = await bcrypt.compare(password, member.passwordHash as string);
      } else {
        // データベースから取得した場合（現在はパスワード検証なし、SPC会員DB APIで検証予定）
        // TODO: SPC会員DB APIで認証
        // 暫定的に、固定パスワードで検証
        const defaultPassword = 'password123';
        isPasswordValid = password === defaultPassword;
      }

      if (!isPasswordValid) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'ユーザー名またはパスワードが正しくありません',
          },
        });
      }

      // env.tsで型が定義されているため、必ずstring型
      const jwtSecret = env.JWT_SECRET;
      const expiresIn = env.JWT_EXPIRES_IN;
      const refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN;

      const accessTokenOptions: SignOptions = {
        expiresIn: expiresIn as any,
      };

      const refreshTokenOptions: SignOptions = {
        expiresIn: refreshExpiresIn as any,
      };

      const accessToken = jwt.sign(
        { id: member.id, memberId: member.memberId, role: member.role },
        jwtSecret,
        accessTokenOptions
      );

      const refreshToken = jwt.sign(
        { id: member.id, memberId: member.memberId },
        jwtSecret,
        refreshTokenOptions
      );

      // 最終ログイン日時を更新（データベース接続がある場合のみ）
      try {
        await prisma.member.update({
          where: { id: member.id },
          data: { lastLoginAt: new Date() },
        });
      } catch (error) {
        // データベース接続エラーは無視
      }

      res.json({
        accessToken,
        refreshToken,
        expiresIn: 3600,
        member: {
          id: member.id,
          memberId: member.memberId,
          name: member.name,
          email: member.email,
          departmentId: member.departmentId,
          department: member.department,
          role: member.role,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
          lastLoginAt: member.lastLoginAt?.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'ログインに失敗しました',
        },
      });
    }
  },

  refresh: async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リフレッシュトークンが必要です',
          },
        });
      }

      // env.tsで型が定義されているため、必ずstring型
      const jwtSecret = env.JWT_SECRET;
      const expiresIn = env.JWT_EXPIRES_IN;

      const decoded = jwt.verify(refreshToken, jwtSecret) as any;
      const member = await prisma.member.findUnique({
        where: { id: decoded.id },
      });

      if (!member) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '無効なトークンです',
          },
        });
      }

      const accessTokenOptions: SignOptions = {
        expiresIn: expiresIn as any,
      };

      const newAccessToken = jwt.sign(
        { id: member.id, memberId: member.memberId, role: member.role },
        jwtSecret,
        accessTokenOptions
      );

      res.json({
        accessToken: newAccessToken,
        refreshToken,
        expiresIn: 3600,
        member: {
          id: member.id,
          memberId: member.memberId,
          name: member.name,
          email: member.email,
          departmentId: member.departmentId,
          role: member.role,
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '無効なトークンです',
        },
      });
    }
  },

  logout: async (req: Request, res: Response) => {
    // TODO: トークンをブラックリストに追加する場合の実装
    res.json({ message: 'ログアウトしました' });
  },
};

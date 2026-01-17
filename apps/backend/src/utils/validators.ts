import { z } from 'zod';

/**
 * バリデーションスキーマ
 */
export const validators = {
  login: z.object({
    username: z.string().min(1, 'ユーザー名を入力してください'),
    password: z.string().min(1, 'パスワードを入力してください'),
  }),

  expenseApplicationCreate: z.object({
    expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません'),
    amount: z.number().positive('金額は0より大きい値である必要があります'),
    description: z.string().min(1, '申請内容を入力してください').max(1000, '申請内容は1000文字以内で入力してください'),
  }),

  expenseApplicationUpdate: z.object({
    expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません').optional(),
    amount: z.number().positive('金額は0より大きい値である必要があります').optional(),
    description: z.string().min(1, '申請内容を入力してください').max(1000, '申請内容は1000文字以内で入力してください').optional(),
  }),

  approval: z.object({
    internalCategoryId: z.number().int().positive('社内カテゴリを選択してください'),
    finalAmount: z.number().nonnegative('確定金額は0以上である必要があります'),
    comment: z.string().max(500, 'コメントは500文字以内で入力してください').optional(),
  }),

  rejection: z.object({
    comment: z.string().min(1, '差戻し理由を入力してください').max(500, '差戻し理由は500文字以内で入力してください'),
  }),

  internalCategoryCreate: z.object({
    name: z.string().min(1, 'カテゴリ名を入力してください').max(100, 'カテゴリ名は100文字以内で入力してください'),
    code: z.string().min(1, 'コードを入力してください').max(20, 'コードは20文字以内で入力してください').regex(/^[A-Z0-9_]+$/, 'コードは英大文字、数字、アンダースコアのみ使用可能です'),
    description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
  }),

  internalCategoryUpdate: z.object({
    name: z.string().min(1, 'カテゴリ名を入力してください').max(100, 'カテゴリ名は100文字以内で入力してください').optional(),
    code: z.string().min(1, 'コードを入力してください').max(20, 'コードは20文字以内で入力してください').regex(/^[A-Z0-9_]+$/, 'コードは英大文字、数字、アンダースコアのみ使用可能です').optional(),
    description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
    isActive: z.boolean().optional(),
  }),
};

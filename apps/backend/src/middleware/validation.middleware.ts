import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * バリデーションミドルウェア
 * @param schema Zodスキーマ
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'バリデーションエラー',
            details: errors,
          },
        });
      }

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラー',
        },
      });
    }
  };
};

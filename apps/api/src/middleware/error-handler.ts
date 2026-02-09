import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { ERROR_CODES, type ApiResponse } from '@spc/shared'
import { AuthError } from '../lib/jwt.js'

export class AppError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
  }
}

function buildErrorResponse(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<never> {
  return Object.freeze({
    success: false,
    error: Object.freeze({
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    }),
  })
}

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) =>
      Object.freeze({
        path: issue.path.join('.'),
        message: issue.message,
      }),
    )
    return c.json(
      buildErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Validation failed',
        details,
      ),
      400,
    )
  }

  if (err instanceof AuthError) {
    const statusCode = err.code === 'FORBIDDEN' ? 403 : 401
    return c.json(buildErrorResponse(err.code, err.message), statusCode)
  }

  if (err instanceof AppError) {
    return c.json(
      buildErrorResponse(err.code, err.message),
      err.statusCode as 400,
    )
  }

  if (err instanceof HTTPException) {
    return c.json(
      buildErrorResponse(mapStatusToCode(err.status), err.message),
      err.status,
    )
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const message = isProduction ? 'An unexpected error occurred' : err.message

  return c.json(buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, message), 500)
}

function mapStatusToCode(status: number): string {
  switch (status) {
    case 401:
      return ERROR_CODES.UNAUTHORIZED
    case 403:
      return ERROR_CODES.FORBIDDEN
    case 404:
      return ERROR_CODES.NOT_FOUND
    case 422:
      return ERROR_CODES.VALIDATION_ERROR
    default:
      return ERROR_CODES.INTERNAL_ERROR
  }
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStorageService } from '../storage-service.js'
import type { Env } from '../../config/env.js'

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from('file-content')),
  unlink: vi.fn().mockResolvedValue(undefined),
}))

const mockSend = vi.fn().mockResolvedValue({})
const mockGetSignedUrl = vi.fn().mockResolvedValue('https://presigned.example.com/file')

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ ...input, _type: 'PutObject' })),
  GetObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ ...input, _type: 'GetObject' })),
  DeleteObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ ...input, _type: 'DeleteObject' })),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}))

import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const baseEnv: Env = {
  NODE_ENV: 'test',
  PORT: 3001,
  DATABASE_URL: 'postgresql://test',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  JWT_ACCESS_TOKEN_EXPIRES_IN: '15m',
  JWT_REFRESH_TOKEN_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'http://localhost:3000',
  S3_BUCKET_NAME: 'spc-receipts',
  S3_REGION: 'auto',
}

const s3Env: Env = {
  ...baseEnv,
  S3_ENDPOINT: 'https://s3.example.com',
  S3_ACCESS_KEY_ID: 'test-access-key',
  S3_SECRET_ACCESS_KEY: 'test-secret-key',
}

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createStorageService factory', () => {
    it('returns S3 storage when S3 is configured', () => {
      const service = createStorageService(s3Env)

      expect(service).toBeDefined()
      expect(service.uploadFile).toBeTypeOf('function')
      expect(service.getSignedDownloadUrl).toBeTypeOf('function')
      expect(service.deleteFile).toBeTypeOf('function')
    })

    it('returns local storage when S3 is not configured', () => {
      const service = createStorageService(baseEnv)

      expect(service).toBeDefined()
      expect(service.uploadFile).toBeTypeOf('function')
      expect(service.getFileBuffer).toBeTypeOf('function')
    })
  })

  describe('Local Storage', () => {
    function createLocalService() {
      return createStorageService(baseEnv)
    }

    it('uploadFile creates directories and writes file', async () => {
      const service = createLocalService()
      const buffer = Buffer.from('test-file-data')

      const result = await service.uploadFile('receipts/app-1/file.pdf', buffer, 'application/pdf')

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('receipts/app-1'),
        { recursive: true },
      )
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('receipts/app-1/file.pdf'),
        buffer,
      )
      expect(result).toBe('receipts/app-1/file.pdf')
    })

    it('getSignedDownloadUrl returns local API path', async () => {
      const service = createLocalService()

      const url = await service.getSignedDownloadUrl('receipts/app-1/file.pdf')

      expect(url).toBe('/api/uploads/receipts/app-1/file.pdf')
    })

    it('deleteFile calls unlink on the file', async () => {
      const service = createLocalService()

      await service.deleteFile('receipts/app-1/file.pdf')

      expect(unlink).toHaveBeenCalledWith(
        expect.stringContaining('receipts/app-1/file.pdf'),
      )
    })

    it('deleteFile handles missing file gracefully', async () => {
      vi.mocked(unlink).mockRejectedValueOnce(new Error('ENOENT: no such file'))
      const service = createLocalService()

      await expect(service.deleteFile('nonexistent/file.pdf')).resolves.toBeUndefined()
    })

    it('getFileBuffer reads and returns file buffer', async () => {
      const service = createLocalService()

      const buffer = await service.getFileBuffer!('receipts/app-1/file.pdf')

      expect(readFile).toHaveBeenCalledWith(
        expect.stringContaining('receipts/app-1/file.pdf'),
      )
      expect(buffer).toEqual(Buffer.from('file-content'))
    })
  })

  describe('S3 Storage', () => {
    function createS3Service() {
      return createStorageService(s3Env)
    }

    it('uploadFile sends PutObjectCommand', async () => {
      const service = createS3Service()
      const buffer = Buffer.from('test-data')

      const result = await service.uploadFile('receipts/app-1/file.pdf', buffer, 'application/pdf')

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'spc-receipts',
        Key: 'receipts/app-1/file.pdf',
        Body: buffer,
        ContentType: 'application/pdf',
      })
      expect(mockSend).toHaveBeenCalled()
      expect(result).toBe('receipts/app-1/file.pdf')
    })

    it('getSignedDownloadUrl returns presigned URL', async () => {
      const service = createS3Service()

      const url = await service.getSignedDownloadUrl('receipts/app-1/file.pdf')

      expect(url).toBe('https://presigned.example.com/file')
      expect(mockGetSignedUrl).toHaveBeenCalled()
    })

    it('deleteFile sends DeleteObjectCommand', async () => {
      const service = createS3Service()

      await service.deleteFile('receipts/app-1/file.pdf')

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'spc-receipts',
        Key: 'receipts/app-1/file.pdf',
      })
      expect(mockSend).toHaveBeenCalled()
    })

    it('lazily initializes S3 client on first use', async () => {
      const service = createS3Service()

      expect(S3Client).not.toHaveBeenCalled()

      await service.uploadFile('key', Buffer.from('data'), 'application/pdf')

      expect(S3Client).toHaveBeenCalledTimes(1)
      expect(S3Client).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://s3.example.com',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      })

      await service.uploadFile('key2', Buffer.from('data2'), 'application/pdf')

      expect(S3Client).toHaveBeenCalledTimes(1)
    })
  })
})

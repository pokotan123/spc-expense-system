import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Env } from '../config/env.js'

function isS3Configured(env: Env): boolean {
  return Boolean(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)
}

function createLocalStorageService() {
  const uploadDir = join(process.cwd(), 'uploads')

  async function uploadFile(
    key: string,
    body: Buffer | Uint8Array,
    _contentType: string,
  ): Promise<string> {
    const filePath = join(uploadDir, key)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, body)
    return key
  }

  async function getSignedDownloadUrl(key: string): Promise<string> {
    return `/api/uploads/${key}`
  }

  async function deleteFile(key: string): Promise<void> {
    const filePath = join(uploadDir, key)
    try {
      await unlink(filePath)
    } catch {
      // File may not exist
    }
  }

  async function getFileBuffer(key: string): Promise<Buffer> {
    const filePath = join(uploadDir, key)
    return readFile(filePath)
  }

  return Object.freeze({ uploadFile, getSignedDownloadUrl, deleteFile, getFileBuffer })
}

function createS3StorageService(env: Env) {
  let client: S3Client | null = null

  function getClient(): S3Client {
    if (!client) {
      client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID!,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
        },
      })
    }
    return client
  }

  async function uploadFile(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
  ): Promise<string> {
    const s3 = getClient()
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
    return key
  }

  async function getSignedDownloadUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const s3 = getClient()
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    })
    return getSignedUrl(s3, command, { expiresIn })
  }

  async function deleteFile(key: string): Promise<void> {
    const s3 = getClient()
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
      }),
    )
  }

  return Object.freeze({ uploadFile, getSignedDownloadUrl, deleteFile })
}

export function createStorageService(env: Env) {
  if (isS3Configured(env)) {
    return createS3StorageService(env)
  }
  return createLocalStorageService()
}

export type StorageService = {
  readonly uploadFile: (key: string, body: Buffer | Uint8Array, contentType: string) => Promise<string>
  readonly getSignedDownloadUrl: (key: string, expiresIn?: number) => Promise<string>
  readonly deleteFile: (key: string) => Promise<void>
  readonly getFileBuffer?: (key: string) => Promise<Buffer>
}

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Env } from '../config/env.js'

export function createStorageService(env: Env) {
  let client: S3Client | null = null

  function getClient(): S3Client {
    if (!client) {
      if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
        throw new Error('S3 storage is not configured')
      }
      client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
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

export type StorageService = ReturnType<typeof createStorageService>

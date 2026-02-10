'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/format'
import type { Receipt } from '@/lib/types'

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

interface ReceiptUploadProps {
  readonly receipts: readonly Receipt[]
  readonly onUpload: (file: File) => void
  readonly onRemove: (receiptId: string) => void
  readonly isUploading: boolean
  readonly disabled?: boolean
}

export function ReceiptUpload({
  receipts,
  onUpload,
  onRemove,
  isUploading,
  disabled = false,
}: ReceiptUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) {
        onUpload(file)
      }
    },
    [onUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled: disabled || isUploading,
  })

  function isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          (disabled || isUploading) && 'cursor-not-allowed opacity-50',
        )}
      >
        <input {...getInputProps()} aria-label="領収書をアップロード" />
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive
            ? 'ここにドロップ'
            : 'クリックまたはドラッグ＆ドロップ'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG, WebP, PDF（最大10MB）
        </p>
        {isUploading ? (
          <p className="mt-2 text-sm text-primary">アップロード中...</p>
        ) : null}
      </div>

      {receipts.length > 0 ? (
        <ul className="space-y-2" aria-label="アップロード済み領収書">
          {receipts.map((receipt) => (
            <li
              key={receipt.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {isImageFile(receipt.mimeType) ? (
                <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {receipt.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(receipt.fileSize)}
                </p>
              </div>
              {!disabled ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label={`${receipt.fileName}を削除`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>領収書の削除</AlertDialogTitle>
                      <AlertDialogDescription>
                        {receipt.fileName} を削除しますか？
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onRemove(receipt.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

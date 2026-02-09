'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ApplicationForm } from '@/components/application/application-form'
import {
  useApplicationDetail,
  useUpdateApplication,
  useUploadReceipt,
  useDeleteReceipt,
} from '@/hooks/use-applications'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { ApplicationFormValues } from '@/lib/validations'

export default function EditApplicationPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { data: application, isLoading } = useApplicationDetail(id)
  const updateMutation = useUpdateApplication(id)
  const uploadMutation = useUploadReceipt(id)
  const deleteMutation = useDeleteReceipt(id)

  async function handleSave(values: ApplicationFormValues) {
    try {
      await updateMutation.mutateAsync({
        expenseDate: values.expenseDate,
        amount: values.amount,
        description: values.description,
        isCashPayment: values.isCashPayment,
        internalCategoryId: values.internalCategoryId,
      })
      toast({ title: '申請を更新しました' })
      router.push(`/applications/${id}`)
    } catch (error) {
      toast({
        title: '更新に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  function handleUpload(file: File) {
    uploadMutation.mutate(file, {
      onError: (error) => {
        toast({
          title: 'アップロードに失敗しました',
          description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
          variant: 'destructive',
        })
      },
    })
  }

  function handleRemoveReceipt(receiptId: string) {
    deleteMutation.mutate(receiptId, {
      onError: (error) => {
        toast({
          title: '削除に失敗しました',
          description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
          variant: 'destructive',
        })
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">申請が見つかりません</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        申請編集 - {application.applicationNumber}
      </h1>
      <ApplicationForm
        defaultValues={{
          expenseDate: application.expenseDate.split('T')[0] ?? '',
          amount: application.amount,
          description: application.description,
          isCashPayment: application.isCashPayment,
          internalCategoryId: application.internalCategoryId ?? undefined,
        }}
        receipts={application.receipts}
        onSave={handleSave}
        onUploadReceipt={handleUpload}
        onRemoveReceipt={handleRemoveReceipt}
        isSaving={updateMutation.isPending}
        isUploading={uploadMutation.isPending}
      />
    </div>
  )
}

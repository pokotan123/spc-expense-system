'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApplicationForm } from '@/components/application/application-form'
import { SubmitDialog } from '@/components/application/submit-dialog'
import { useCreateApplication, useSubmitApplication } from '@/hooks/use-applications'
import { useToast } from '@/components/ui/use-toast'
import type { ApplicationFormValues } from '@/lib/validations'

export default function NewApplicationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const createMutation = useCreateApplication()
  const submitMutation = useSubmitApplication()
  const [pendingSubmitId, setPendingSubmitId] = useState<string | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)

  async function handleSave(values: ApplicationFormValues) {
    try {
      const app = await createMutation.mutateAsync({
        expenseDate: values.expenseDate,
        amount: values.amount,
        description: values.description,
        isCashPayment: values.isCashPayment,
        internalCategoryId: values.internalCategoryId,
      })
      toast({
        title: '下書き保存しました',
        description: `申請番号: ${app.applicationNumber}`,
      })
      router.push(`/applications/${app.id}`)
    } catch (error) {
      toast({
        title: '保存に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  async function handleSubmitRequest(values: ApplicationFormValues) {
    try {
      const app = await createMutation.mutateAsync({
        expenseDate: values.expenseDate,
        amount: values.amount,
        description: values.description,
        isCashPayment: values.isCashPayment,
        internalCategoryId: values.internalCategoryId,
      })
      setPendingSubmitId(app.id)
      setShowSubmitDialog(true)
    } catch (error) {
      toast({
        title: '保存に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  async function handleConfirmSubmit(comment?: string) {
    if (!pendingSubmitId) return
    try {
      await submitMutation.mutateAsync({ id: pendingSubmitId, comment })
      setShowSubmitDialog(false)
      toast({ title: '申請を提出しました' })
      router.push(`/applications/${pendingSubmitId}`)
    } catch (error) {
      toast({
        title: '提出に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/applications" aria-label="一覧に戻る">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">新規経費申請</h1>
      </div>
      <ApplicationForm
        onSave={handleSave}
        onSubmit={handleSubmitRequest}
        onCancel={() => router.push('/applications')}
        isSaving={createMutation.isPending}
        isSubmitting={submitMutation.isPending}
      />
      <SubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onConfirm={handleConfirmSubmit}
        isSubmitting={submitMutation.isPending}
      />
    </div>
  )
}

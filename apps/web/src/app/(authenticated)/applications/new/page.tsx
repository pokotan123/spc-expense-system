'use client'

import { useRouter } from 'next/navigation'
import { ApplicationForm } from '@/components/application/application-form'
import { useCreateApplication } from '@/hooks/use-applications'
import { useToast } from '@/components/ui/use-toast'
import type { ApplicationFormValues } from '@/lib/validations'

export default function NewApplicationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const createMutation = useCreateApplication()

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新規経費申請</h1>
      <ApplicationForm
        onSave={handleSave}
        isSaving={createMutation.isPending}
      />
    </div>
  )
}

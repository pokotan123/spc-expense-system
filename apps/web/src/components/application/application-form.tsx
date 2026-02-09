'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ReceiptUpload } from '@/components/application/receipt-upload'
import { applicationFormSchema, type ApplicationFormValues } from '@/lib/validations'
import type { Receipt } from '@/lib/types'

interface ApplicationFormProps {
  readonly defaultValues?: Partial<ApplicationFormValues>
  readonly receipts?: readonly Receipt[]
  readonly onSave: (values: ApplicationFormValues) => void
  readonly onSubmit?: (values: ApplicationFormValues) => void
  readonly onUploadReceipt?: (file: File) => void
  readonly onRemoveReceipt?: (receiptId: string) => void
  readonly isSaving: boolean
  readonly isSubmitting?: boolean
  readonly isUploading?: boolean
}

export function ApplicationForm({
  defaultValues,
  receipts = [],
  onSave,
  onSubmit,
  onUploadReceipt,
  onRemoveReceipt,
  isSaving,
  isSubmitting = false,
  isUploading = false,
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      expenseDate: '',
      amount: undefined as unknown as number,
      description: '',
      isCashPayment: false,
      ...defaultValues,
    },
  })

  const isCashPayment = watch('isCashPayment')
  const descriptionValue = watch('description')
  const descriptionLength = descriptionValue?.length ?? 0

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">申請内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expenseDate">経費発生日</Label>
              <Input
                id="expenseDate"
                type="date"
                aria-describedby={
                  errors.expenseDate ? 'expenseDate-error' : undefined
                }
                aria-invalid={errors.expenseDate ? 'true' : undefined}
                {...register('expenseDate')}
              />
              {errors.expenseDate ? (
                <p
                  id="expenseDate-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.expenseDate.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">金額（円）</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ¥
                </span>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="0"
                  className="pl-7"
                  aria-describedby={
                    errors.amount ? 'amount-error' : undefined
                  }
                  aria-invalid={errors.amount ? 'true' : undefined}
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              {errors.amount ? (
                <p
                  id="amount-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.amount.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">摘要</Label>
              <span
                className={`text-xs ${
                  descriptionLength > 500
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                {descriptionLength} / 500
              </span>
            </div>
            <Textarea
              id="description"
              placeholder="経費の内容を入力してください"
              rows={3}
              aria-describedby={
                errors.description ? 'description-error' : undefined
              }
              aria-invalid={errors.description ? 'true' : undefined}
              {...register('description')}
            />
            {errors.description ? (
              <p
                id="description-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isCashPayment"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={isCashPayment}
              onChange={(e) => setValue('isCashPayment', e.target.checked)}
            />
            <Label htmlFor="isCashPayment" className="cursor-pointer">
              現金立替払い
            </Label>
          </div>
        </CardContent>
      </Card>

      {onUploadReceipt && onRemoveReceipt ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">領収書</CardTitle>
          </CardHeader>
          <CardContent>
            <ReceiptUpload
              receipts={receipts}
              onUpload={onUploadReceipt}
              onRemove={onRemoveReceipt}
              isUploading={isUploading}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          variant="outline"
          disabled={isSaving || isSubmitting}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          下書き保存
        </Button>
        {onSubmit ? (
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            申請する
          </Button>
        ) : null}
      </div>
    </form>
  )
}

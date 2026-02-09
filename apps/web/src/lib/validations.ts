import { z } from 'zod'

export const applicationFormSchema = z.object({
  expenseDate: z
    .string()
    .min(1, '経費発生日を入力してください'),
  amount: z
    .number({ invalid_type_error: '金額を入力してください' })
    .int('金額は整数で入力してください')
    .min(1, '金額は1円以上を入力してください')
    .max(10_000_000, '金額は1,000万円以下で入力してください'),
  description: z
    .string()
    .min(1, '摘要を入力してください')
    .max(500, '摘要は500文字以内で入力してください'),
  isCashPayment: z.boolean(),
  internalCategoryId: z.string().optional(),
})

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>

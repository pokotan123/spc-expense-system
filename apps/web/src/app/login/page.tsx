'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'
import { apiPost } from '@/lib/api-client'

const loginSchema = z.object({
  memberId: z
    .string()
    .min(1, '会員IDを入力してください'),
  password: z
    .string()
    .min(1, 'パスワードを入力してください'),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginResponse {
  readonly accessToken: string
  readonly member: {
    readonly id: string
    readonly name: string
    readonly role: 'MEMBER' | 'ADMIN'
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [loginError, setLoginError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      memberId: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setLoginError(null)

    try {
      const response = await apiPost<LoginResponse>('/auth/login', {
        memberId: values.memberId,
        password: values.password,
      })

      if (response.success && response.data) {
        setAuth({
          accessToken: response.data.accessToken,
          memberId: response.data.member.id,
          memberName: response.data.member.name,
          role: response.data.member.role,
        })
        router.push('/dashboard')
      } else {
        setLoginError(response.error ?? 'ログインに失敗しました')
      }
    } catch {
      setLoginError('会員IDまたはパスワードが正しくありません')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-primary">SPC通商</h2>
          </div>
          <CardTitle className="text-xl">経費精算システム</CardTitle>
          <p className="text-sm text-muted-foreground">
            会員IDとパスワードでログインしてください
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberId">会員ID</Label>
              <Input
                id="memberId"
                type="text"
                placeholder="会員IDを入力"
                autoComplete="username"
                aria-describedby={
                  errors.memberId ? 'memberId-error' : undefined
                }
                aria-invalid={errors.memberId ? 'true' : undefined}
                {...register('memberId')}
              />
              {errors.memberId ? (
                <p
                  id="memberId-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.memberId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                autoComplete="current-password"
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                aria-invalid={errors.password ? 'true' : undefined}
                {...register('password')}
              />
              {errors.password ? (
                <p
                  id="password-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {loginError ? (
              <div
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {loginError}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

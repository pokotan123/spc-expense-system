'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  useCategoryList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/use-admin'
import { useToast } from '@/components/ui/use-toast'

interface CategoryFormData {
  name: string
  code: string
  description: string
}

interface EditingCategory {
  readonly id: string
  readonly name: string
  readonly code: string
  readonly description: string | null
  readonly isActive: boolean
}

function CategorySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function AdminCategoriesPage() {
  const { toast } = useToast()
  const { data: categories, isLoading } = useCategoryList(true)
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    code: '',
    description: '',
  })

  function openCreateDialog() {
    setFormData({ name: '', code: '', description: '' })
    setShowCreateDialog(true)
  }

  function openEditDialog(category: EditingCategory) {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description ?? '',
    })
  }

  async function handleCreate() {
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
      })
      setShowCreateDialog(false)
      toast({ title: 'カテゴリを作成しました' })
    } catch (error) {
      toast({
        title: '作成に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  async function handleUpdate() {
    if (!editingCategory) return

    try {
      await updateMutation.mutateAsync({
        id: editingCategory.id,
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
      })
      setEditingCategory(null)
      toast({ title: 'カテゴリを更新しました' })
    } catch (error) {
      toast({
        title: '更新に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id)
      toast({ title: 'カテゴリを削除しました' })
    } catch (error) {
      toast({
        title: '削除に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  async function handleToggleActive(category: EditingCategory) {
    try {
      await updateMutation.mutateAsync({
        id: category.id,
        is_active: !category.isActive,
      })
      toast({
        title: category.isActive ? 'カテゴリを無効化しました' : 'カテゴリを有効化しました',
      })
    } catch (error) {
      toast({
        title: '更新に失敗しました',
        description: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) return <CategorySkeleton />

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">社内カテゴリ管理</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          新規カテゴリ
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">カテゴリ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {!categories || categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              カテゴリがありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>コード</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-mono text-sm">
                      {category.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {category.description ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={category.isActive ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(category)}
                      >
                        {category.isActive ? '有効' : '無効'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>カテゴリの削除</AlertDialogTitle>
                              <AlertDialogDescription>
                                カテゴリ「{category.name}」を削除しますか？
                                使用中のカテゴリは無効化されます。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(category.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                削除する
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規カテゴリ作成</DialogTitle>
            <DialogDescription>
              社内カテゴリを新規に作成します。
            </DialogDescription>
          </DialogHeader>
          <CategoryFormFields
            formData={formData}
            onChange={setFormData}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isPending || !formData.name || !formData.code}
            >
              {isPending ? '作成中...' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editingCategory !== null}
        onOpenChange={(open) => { if (!open) setEditingCategory(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリ編集</DialogTitle>
            <DialogDescription>
              カテゴリ情報を編集します。
            </DialogDescription>
          </DialogHeader>
          <CategoryFormFields
            formData={formData}
            onChange={setFormData}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCategory(null)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isPending || !formData.name || !formData.code}
            >
              {isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryFormFields({
  formData,
  onChange,
}: {
  readonly formData: CategoryFormData
  readonly onChange: (data: CategoryFormData) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category-name">カテゴリ名 *</Label>
        <Input
          id="category-name"
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
          placeholder="例: 交通費"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category-code">コード *</Label>
        <Input
          id="category-code"
          value={formData.code}
          onChange={(e) => onChange({ ...formData, code: e.target.value })}
          placeholder="例: TRANSPORT"
        />
        <p className="text-xs text-muted-foreground">
          一意のコードを入力してください。
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="category-description">説明</Label>
        <Textarea
          id="category-description"
          value={formData.description}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          placeholder="カテゴリの説明（任意）"
          rows={2}
        />
      </div>
    </div>
  )
}

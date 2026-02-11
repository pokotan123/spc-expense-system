'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OcrResult } from '@/lib/types'

interface OcrEditDialogProps {
  readonly ocrResult: OcrResult
  readonly onSave: (data: {
    readonly extracted_date?: string
    readonly extracted_amount?: number
    readonly extracted_store_name?: string
  }) => Promise<void>
  readonly isPending: boolean
}

export function OcrEditDialog({ ocrResult, onSave, isPending }: OcrEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(ocrResult.extractedDate ?? '')
  const [amount, setAmount] = useState(ocrResult.extractedAmount ?? '')
  const [storeName, setStoreName] = useState(ocrResult.extractedStoreName ?? '')

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      setDate(ocrResult.extractedDate ?? '')
      setAmount(ocrResult.extractedAmount ?? '')
      setStoreName(ocrResult.extractedStoreName ?? '')
    }
    setOpen(isOpen)
  }

  async function handleSave() {
    const data: Record<string, string | number> = {}
    if (date) data.extracted_date = date
    if (amount) data.extracted_amount = Number(amount)
    if (storeName) data.extracted_store_name = storeName

    await onSave(data)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
          <Pencil className="mr-1 h-3 w-3" />
          修正
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>OCR結果の修正</DialogTitle>
          <DialogDescription>
            自動読み取り結果を手動で修正できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ocr-store-name">店舗名</Label>
            <Input
              id="ocr-store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="店舗名"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ocr-date">日付</Label>
            <Input
              id="ocr-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ocr-amount">金額</Label>
            <Input
              id="ocr-amount"
              type="number"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="金額（円）"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

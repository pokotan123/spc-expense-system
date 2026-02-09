import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'yyyy/MM/dd', { locale: ja })
}

export function formatDateTime(dateString: string): string {
  return format(parseISO(dateString), 'yyyy/MM/dd HH:mm', { locale: ja })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

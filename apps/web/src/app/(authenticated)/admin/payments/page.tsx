import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">振込データ</h1>
      <Card>
        <CardHeader>
          <CardTitle>振込データ管理</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">実装予定</p>
        </CardContent>
      </Card>
    </div>
  )
}

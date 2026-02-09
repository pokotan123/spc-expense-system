import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">マイページ</h1>
      <Card>
        <CardHeader>
          <CardTitle>ダッシュボード</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">実装予定</p>
        </CardContent>
      </Card>
    </div>
  )
}

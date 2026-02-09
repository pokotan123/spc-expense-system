import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminApplicationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">申請管理</h1>
      <Card>
        <CardHeader>
          <CardTitle>申請一覧（管理者）</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">実装予定</p>
        </CardContent>
      </Card>
    </div>
  )
}

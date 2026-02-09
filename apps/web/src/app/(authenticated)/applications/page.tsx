import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">経費申請一覧</h1>
      <Card>
        <CardHeader>
          <CardTitle>申請一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">実装予定</p>
        </CardContent>
      </Card>
    </div>
  )
}

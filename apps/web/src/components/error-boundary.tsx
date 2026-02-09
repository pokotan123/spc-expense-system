'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  readonly children: ReactNode
  readonly fallback?: ReactNode
}

interface ErrorBoundaryState {
  readonly hasError: boolean
  readonly error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>エラーが発生しました</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                予期しないエラーが発生しました。ページを再読み込みしてください。
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error ? (
                <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 text-left text-xs">
                  {this.state.error.message}
                </pre>
              ) : null}
              <div className="flex justify-center gap-3">
                <Button onClick={this.handleReset} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  再試行
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = '/dashboard'
                  }}
                >
                  ホームに戻る
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

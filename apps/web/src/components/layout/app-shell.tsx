'use client'

import { useState, type ReactNode } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

interface AppShellProps {
  readonly children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  function handleMenuToggle() {
    setIsMobileMenuOpen((prev) => !prev)
  }

  function handleMobileNavigate() {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">ナビゲーションメニュー</SheetTitle>
          <Sidebar onNavigate={handleMobileNavigate} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={handleMenuToggle} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}

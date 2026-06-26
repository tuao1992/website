import type { ReactNode } from 'react'
import type { View } from '../../types'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { TopTabs } from './TopTabs'

export function AppShell({
  active,
  onChange,
  onAccountClick,
  children,
}: {
  active: View
  onChange: (v: View) => void
  onAccountClick: () => void
  children: ReactNode
}) {
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <Header onAccountClick={onAccountClick} />
      <TopTabs active={active} onChange={onChange} />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      <BottomNav active={active} onChange={onChange} />
    </div>
  )
}

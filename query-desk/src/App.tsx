import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { OpenQuestionsPage } from './pages/OpenQuestionsPage'
import { AnsweredQuestionsPage } from './pages/AnsweredQuestionsPage'
import { SummaryPage } from './pages/SummaryPage'
import { AccountPage } from './pages/AccountPage'
import { AppShell } from './components/layout/AppShell'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import type { View } from './types'

function AuthenticatedApp() {
  const [view, setView] = useState<View>('open')

  return (
    <AppShell active={view} onChange={setView} onAccountClick={() => setView('account')}>
      {view === 'open' && <OpenQuestionsPage />}
      {view === 'answered' && <AnsweredQuestionsPage />}
      {view === 'summary' && <SummaryPage />}
      {view === 'account' && <AccountPage />}
    </AppShell>
  )
}

function Root() {
  const { firebaseUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner label="Loading…" />
      </div>
    )
  }

  return firebaseUser ? <AuthenticatedApp /> : <LoginPage />
}

function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}

export default App

import { useMemo } from 'react'
import { useQuestions } from '../hooks/useQuestions'
import { useUsers } from '../hooks/useUsers'
import { SummaryStats } from '../components/summary/SummaryStats'
import { OpenByPersonTable } from '../components/summary/OpenByPersonTable'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorState } from '../components/common/ErrorState'
import { RefreshButton } from '../components/common/RefreshButton'

export function SummaryPage() {
  const { questions, loading, error, refresh, refreshing } = useQuestions()
  const { users, loading: usersLoading } = useUsers()

  const { openCount, answeredCount, openByPerson } = useMemo(() => {
    const openQuestions = questions.filter((q) => q.status === 'open')
    const answeredQuestions = questions.filter((q) => q.status === 'answered')

    const counts = new Map<string, number>()
    for (const user of users) counts.set(user.uid, 0)
    for (const q of openQuestions) {
      counts.set(q.raisedByUid, (counts.get(q.raisedByUid) ?? 0) + 1)
    }

    const rows = users
      .map((u) => ({ name: u.displayName, count: counts.get(u.uid) ?? 0 }))
      .sort((a, b) => b.count - a.count)

    return { openCount: openQuestions.length, answeredCount: answeredQuestions.length, openByPerson: rows }
  }, [questions, users])

  if (loading || usersLoading) return <LoadingSpinner label="Loading summary…" />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-end px-4 pt-3">
        <RefreshButton onRefresh={refresh} refreshing={refreshing} />
      </div>
      <SummaryStats open={openCount} answered={answeredCount} />
      <OpenByPersonTable rows={openByPerson} />
    </div>
  )
}

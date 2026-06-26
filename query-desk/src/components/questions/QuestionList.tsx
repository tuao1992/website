import type { Question } from '../../types'
import { QuestionCard } from './QuestionCard'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { EmptyState } from '../common/EmptyState'
import { ErrorState } from '../common/ErrorState'

export function QuestionList({
  questions,
  loading,
  error,
  onRetry,
  emptyMessage,
}: {
  questions: Question[]
  loading: boolean
  error: string | null
  onRetry: () => void
  emptyMessage: string
}) {
  if (loading) return <LoadingSpinner label="Loading questions…" />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (questions.length === 0) return <EmptyState message={emptyMessage} />

  return (
    <div className="flex flex-col gap-3 p-4">
      {questions.map((q) => (
        <QuestionCard key={q.id} question={q} />
      ))}
    </div>
  )
}

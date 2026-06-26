import type { QuestionStatus } from '../../types'

export function StatusBadge({ status }: { status: QuestionStatus }) {
  if (status === 'answered') {
    return (
      <span className="inline-flex items-center rounded-full bg-status-answered-bg px-2.5 py-0.5 text-xs font-medium text-status-answered">
        Answered
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-status-open-bg px-2.5 py-0.5 text-xs font-medium text-status-open">
      Open
    </span>
  )
}

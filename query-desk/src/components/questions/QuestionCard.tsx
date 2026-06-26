import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../lib/formatDate'
import type { Question } from '../../types'
import { StatusBadge } from './StatusBadge'
import { ReplyControl } from './ReplyControl'

export function QuestionCard({ question }: { question: Question }) {
  const { userDoc } = useAuth()
  const isAdmin = userDoc?.role === 'admin'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <StatusBadge status={question.status} />
      </div>
      <p className="whitespace-pre-wrap text-sm text-gray-900">{question.questionText}</p>
      <p className="mt-2 text-xs text-gray-500">
        Raised by {question.raisedByName} · {formatDate(question.dateRaised)}
      </p>

      {question.status === 'answered' && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <p className="whitespace-pre-wrap text-sm text-gray-800">{question.replyText}</p>
          <p className="mt-1 text-xs text-gray-500">
            Replied by {question.replyByName} · {formatDate(question.replyDate)}
          </p>
        </div>
      )}

      {isAdmin && <ReplyControl question={question} />}
    </div>
  )
}

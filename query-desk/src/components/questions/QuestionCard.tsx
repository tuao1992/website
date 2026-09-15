import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../lib/formatDate'
import type { Question } from '../../types'
import { StatusBadge } from './StatusBadge'
import { ReplyControl } from './ReplyControl'

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i

export function QuestionCard({ question }: { question: Question }) {
  const { userDoc } = useAuth()
  const isAdmin = userDoc?.role === 'admin'
  const isImage = question.attachmentName
    ? IMAGE_EXTENSIONS.test(question.attachmentName)
    : false

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <StatusBadge status={question.status} />
        {question.dueDate && question.status === 'open' && (
          <span className="shrink-0 rounded-full bg-status-open-bg px-2 py-0.5 text-xs font-medium text-status-open">
            Due {formatDate(question.dueDate)}
          </span>
        )}
      </div>

      <p className="whitespace-pre-wrap text-sm text-gray-900">{question.questionText}</p>

      {/* Attachment */}
      {question.attachmentUrl && (
        <div className="mt-2">
          {isImage ? (
            <a href={question.attachmentUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={question.attachmentUrl}
                alt={question.attachmentName ?? 'attachment'}
                className="max-h-40 rounded-lg border border-gray-200 object-contain"
              />
            </a>
          ) : (
            <a
              href={question.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-gray-50"
            >
              📎 {question.attachmentName ?? 'attachment'}
            </a>
          )}
        </div>
      )}

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

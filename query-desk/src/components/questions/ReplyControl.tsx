import { useState } from 'react'
import { submitReply, setDueDate } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import type { Question } from '../../types'

/** Format a Firestore Timestamp (or null) to an HTML date-input value (YYYY-MM-DD). */
function toDateInputValue(ts: import('firebase/firestore').Timestamp | null): string {
  if (!ts) return ''
  const d = ts.toDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ReplyControl({ question }: { question: Question }) {
  const { userDoc } = useAuth()
  const isEdit = question.status === 'answered'
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState(question.replyText ?? '')
  const [dueDateStr, setDueDateStr] = useState(toDateInputValue(question.dueDate))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function parseDueDate(): Date | null {
    if (!dueDateStr) return null
    const d = new Date(dueDateStr + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d
  }

  async function handleSubmit() {
    if (!text.trim()) {
      setError('Reply cannot be empty.')
      return
    }
    if (!userDoc) return
    setSubmitting(true)
    setError(null)
    try {
      await submitReply(question.id, text.trim(), userDoc.displayName, parseDueDate())
      setExpanded(false)
    } catch (err) {
      console.error(err)
      setError('Could not save your reply. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSetDueDate() {
    setSubmitting(true)
    setError(null)
    try {
      await setDueDate(question.id, parseDueDate())
      setExpanded(false)
    } catch (err) {
      console.error(err)
      setError('Could not update due date. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleCancel() {
    setExpanded(false)
    setText(question.replyText ?? '')
    setDueDateStr(toDateInputValue(question.dueDate))
    setError(null)
  }

  if (!expanded) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => setExpanded(true)}
          className="rounded-lg border border-brand-navy px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-brand-navy hover:text-white"
        >
          {isEdit ? 'Edit reply' : 'Answer'}
        </button>
        {!isEdit && (
          <button
            onClick={() => setExpanded(true)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-500 hover:border-brand-navy hover:text-brand-navy"
          >
            Set due date
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Reply text — only shown when answering / editing */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
        disabled={submitting}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        placeholder="Type your reply…"
      />

      {/* Due date */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600">Due by (optional)</label>
        <input
          type="date"
          value={dueDateStr}
          onChange={(e) => setDueDateStr(e.target.value)}
          disabled={submitting}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-brand-navy focus:outline-none"
        />
        {dueDateStr && (
          <button
            type="button"
            onClick={() => setDueDateStr('')}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navy-light disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Send'}
        </button>
        {/* If question is still open, also offer a "Due date only" save */}
        {question.status === 'open' && (
          <button
            onClick={handleSetDueDate}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            Save due date only
          </button>
        )}
        <button
          onClick={handleCancel}
          disabled={submitting}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

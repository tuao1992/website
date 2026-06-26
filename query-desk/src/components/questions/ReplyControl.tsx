import { useState } from 'react'
import { submitReply } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import type { Question } from '../../types'

export function ReplyControl({ question }: { question: Question }) {
  const { userDoc } = useAuth()
  const isEdit = question.status === 'answered'
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState(question.replyText ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!text.trim()) {
      setError('Reply cannot be empty.')
      return
    }
    if (!userDoc) return
    setSubmitting(true)
    setError(null)
    try {
      await submitReply(question.id, text.trim(), userDoc.displayName)
      setExpanded(false)
    } catch (err) {
      console.error(err)
      setError('Could not save your reply. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mt-2 rounded-lg border border-brand-navy px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-brand-navy hover:text-white"
      >
        {isEdit ? 'Edit reply' : 'Answer'}
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
        disabled={submitting}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
        placeholder="Type your reply…"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navy-light disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send'}
        </button>
        <button
          onClick={() => {
            setExpanded(false)
            setText(question.replyText ?? '')
            setError(null)
          }}
          disabled={submitting}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

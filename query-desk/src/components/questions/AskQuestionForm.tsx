import { useState, type FormEvent } from 'react'
import { createQuestion } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'

export function AskQuestionForm() {
  const { firebaseUser, userDoc } = useAuth()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) {
      setError('Type a question before submitting.')
      return
    }
    if (!firebaseUser || !userDoc) return
    setSubmitting(true)
    setError(null)
    try {
      await createQuestion(text.trim(), firebaseUser.uid, userDoc.displayName)
      setText('')
    } catch (err) {
      console.error(err)
      setError('Could not post your question. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-gray-200 bg-white p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        disabled={submitting}
        placeholder="Type your question…"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navy-light disabled:opacity-60"
        >
          {submitting ? 'Posting…' : 'Post question'}
        </button>
      </div>
    </form>
  )
}

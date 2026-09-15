import { useState, useRef, type FormEvent } from 'react'
import { createQuestion, uploadAttachment } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const ACCEPTED = 'image/*,application/pdf,text/plain'

export function AskQuestionForm() {
  const { firebaseUser, userDoc } = useAuth()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null
    if (!chosen) { setFile(null); return }
    if (chosen.size > MAX_FILE_BYTES) {
      setError('Attachment must be under 5 MB.')
      e.target.value = ''
      return
    }
    setError(null)
    setFile(chosen)
  }

  function clearFile() {
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

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
      let attachment: { url: string; name: string } | null = null
      if (file) {
        attachment = await uploadAttachment(firebaseUser.uid, file)
      }
      await createQuestion(text.trim(), firebaseUser.uid, userDoc.displayName, attachment)
      setText('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
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

      {/* Attachment row */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand-navy hover:text-brand-navy">
          📎 Attach file
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileChange}
            disabled={submitting}
            className="hidden"
          />
        </label>
        {file && (
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {file.name}
            <button
              type="button"
              onClick={clearFile}
              className="ml-0.5 text-gray-400 hover:text-red-500"
              aria-label="Remove attachment"
            >
              ✕
            </button>
          </span>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navy-light disabled:opacity-60"
        >
          {submitting ? (file ? 'Uploading…' : 'Posting…') : 'Post question'}
        </button>
      </div>
    </form>
  )
}

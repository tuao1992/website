import { useState, useCallback, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'

function NotificationSection() {
  const supported = 'Notification' in window
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  )

  const requestPermission = useCallback(async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
  }, [])

  if (!supported) return null

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-gray-700">Notifications</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {permission === 'granted' && (
          <p className="text-sm text-status-answered">✓ Notifications enabled — you'll be notified when your questions are answered.</p>
        )}
        {permission === 'default' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Get notified when Akshay answers one of your questions.</p>
            <button
              onClick={requestPermission}
              className="rounded-lg bg-brand-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-navy-light"
            >
              Enable notifications
            </button>
          </div>
        )}
        {permission === 'denied' && (
          <p className="text-sm text-gray-500">
            Notifications are blocked. To enable them, open your browser settings and allow notifications for this site.
          </p>
        )}
      </div>
    </div>
  )
}

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Your current password is incorrect.'
    case 'auth/weak-password':
      return 'New password must be at least 6 characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return 'Could not change your password. Please try again.'
  }
}

export function AccountPage() {
  const { userDoc, firebaseUser, changeOwnPassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSuccess(false)
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await changeOwnPassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setError(friendlyError(code))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col p-4">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Signed in as</p>
          <p className="font-medium text-gray-900">{userDoc?.displayName}</p>
          <p className="text-sm text-gray-500">{firebaseUser?.email}</p>
          {userDoc?.role === 'admin' && (
            <p className="mt-1 text-xs font-medium text-brand-navy">Admin</p>
          )}
        </div>

        <h2 className="mb-3 text-sm font-semibold text-gray-700">Change password</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Current password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
          />
          <input
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-status-answered">Password updated.</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-navy py-2.5 text-sm font-medium text-white hover:bg-brand-navy-light disabled:opacity-60"
          >
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <NotificationSection />

        {userDoc?.role === 'admin' && (
          <p className="mt-6 text-xs text-gray-400">
            To reset another user's password, run{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">npm run reset-password -- &lt;email&gt;</code> from
            the project (see README).
          </p>
        )}
      </div>
    </div>
  )
}

import { useAuth } from '../../contexts/AuthContext'

export function Header({ onAccountClick }: { onAccountClick: () => void }) {
  const { userDoc, logout } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-brand-navy">Weldrite Query Desk</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onAccountClick}
          className="text-sm font-medium text-gray-700 hover:text-brand-navy"
        >
          {userDoc?.displayName ?? '…'}
        </button>
        <button
          onClick={() => logout()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

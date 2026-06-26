export function RefreshButton({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <button
      onClick={onRefresh}
      disabled={refreshing}
      aria-label="Refresh"
      className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
      >
        <path d="M4 4v5h5M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M4.5 9A7.5 7.5 0 0 1 19 7.5M19.5 15a7.5 7.5 0 0 1-14.5 1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

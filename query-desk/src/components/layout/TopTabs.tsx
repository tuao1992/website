import type { View } from '../../types'

const ITEMS: { key: View; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'answered', label: 'Answered' },
  { key: 'summary', label: 'Summary' },
]

export function TopTabs({ active, onChange }: { active: View; onChange: (v: View) => void }) {
  return (
    <nav className="hidden gap-1 border-b border-gray-200 bg-white px-6 sm:flex">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium ${
            active === item.key
              ? 'border-brand-navy text-brand-navy'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

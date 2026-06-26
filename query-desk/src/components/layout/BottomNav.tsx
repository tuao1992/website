import type { View } from '../../types'

const ITEMS: { key: View; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'answered', label: 'Answered' },
  { key: 'summary', label: 'Summary' },
]

export function BottomNav({ active, onChange }: { active: View; onChange: (v: View) => void }) {
  return (
    <nav className="flex border-t border-gray-200 bg-white sm:hidden">
      {ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`flex-1 py-3 text-sm font-medium ${
            active === item.key ? 'text-brand-navy' : 'text-gray-400'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

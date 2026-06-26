export function SummaryStats({
  open,
  answered,
}: {
  open: number
  answered: number
}) {
  const total = open + answered
  const stats = [
    { label: 'Open', value: open, color: 'text-status-open' },
    { label: 'Answered', value: answered, color: 'text-status-answered' },
    { label: 'Total', value: total, color: 'text-brand-navy' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          <p className="mt-1 text-xs text-gray-500">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

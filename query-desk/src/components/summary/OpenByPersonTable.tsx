export function OpenByPersonTable({ rows }: { rows: { name: string; count: number }[] }) {
  return (
    <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <h3 className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
        Open questions by person
      </h3>
      <ul className="divide-y divide-gray-100">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-700">{row.name}</span>
            <span className="font-medium text-status-open">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

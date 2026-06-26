export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 py-12 text-center text-gray-500">
      <p className="text-sm">{message}</p>
    </div>
  )
}

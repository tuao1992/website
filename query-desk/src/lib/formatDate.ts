import type { Timestamp } from 'firebase/firestore'

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDate(timestamp: Timestamp | null): string {
  if (!timestamp) return 'Just now'
  return formatter.format(timestamp.toDate())
}

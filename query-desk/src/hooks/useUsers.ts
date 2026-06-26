import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { usersCollection } from '../lib/firebase'
import type { UserDoc } from '../types'

export function useUsers() {
  const [users, setUsers] = useState<UserDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      usersCollection,
      (snapshot) => {
        setUsers(snapshot.docs.map((d) => d.data() as UserDoc))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsubscribe
  }, [])

  return { users, loading }
}

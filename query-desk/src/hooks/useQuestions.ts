import { useEffect, useState, useCallback } from 'react'
import {
  query,
  where,
  orderBy,
  onSnapshot,
  getDocsFromServer,
} from 'firebase/firestore'
import { questionsCollection } from '../lib/firebase'
import type { Question, QuestionStatus } from '../types'

export function useQuestions(status?: QuestionStatus) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const buildQuery = useCallback(() => {
    const constraints = status
      ? [where('status', '==', status), orderBy('dateRaised', 'desc')]
      : [orderBy('dateRaised', 'desc')]
    return query(questionsCollection, ...constraints)
  }, [status])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const unsubscribe = onSnapshot(
      buildQuery(),
      (snapshot) => {
        setQuestions(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Question),
        )
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Could not load questions. Check your connection and try again.')
        setLoading(false)
      },
    )
    return unsubscribe
  }, [buildQuery])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const snapshot = await getDocsFromServer(buildQuery())
      setQuestions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Question))
      setError(null)
    } catch (err) {
      console.error(err)
      // If offline, keep showing cached data rather than surfacing an error.
    } finally {
      setRefreshing(false)
    }
  }, [buildQuery])

  return { questions, loading, error, refresh, refreshing }
}

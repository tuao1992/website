import { useEffect, useRef } from 'react'
import type { Question } from '../types'

/**
 * Show a browser notification whenever a question raised by the current user
 * transitions from 'open' to 'answered'.
 *
 * This works while the tab/PWA is open or running in the background.
 * Server-push (notification when app is fully closed) requires Cloud Functions
 * + FCM — see README for details.
 */
export function useNotifications(questions: Question[], currentUid: string | null) {
  // Map of questionId → status from the previous render
  const prevStatusRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!currentUid || !('Notification' in window) || Notification.permission !== 'granted') {
      // Snapshot still needs to be updated even if we can't notify
      prevStatusRef.current = new Map(questions.map((q) => [q.id, q.status]))
      return
    }

    const prev = prevStatusRef.current

    for (const q of questions) {
      const wasOpen = prev.get(q.id) === 'open' || (prev.has(q.id) === false && q.status === 'answered')
      const isNowAnswered = q.status === 'answered'
      const isMine = q.raisedByUid === currentUid

      if (isMine && isNowAnswered && prev.get(q.id) === 'open') {
        const body = q.questionText.length > 80
          ? q.questionText.slice(0, 80) + '…'
          : q.questionText

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then((sw) =>
              sw.showNotification('Your question was answered', {
                body,
                icon: '/icons/icon-192.png',
                tag: q.id,
              }),
            )
            .catch(() => {
              // Fall back to plain Notification if SW isn't available
              new Notification('Your question was answered', { body, icon: '/icons/icon-192.png' })
            })
        } else {
          new Notification('Your question was answered', { body, icon: '/icons/icon-192.png' })
        }
      }

      void wasOpen // suppress unused-var lint hint
    }

    // Update snapshot
    prevStatusRef.current = new Map(questions.map((q) => [q.id, q.status]))
  }, [questions, currentUid])
}

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  browserLocalPersistence,
  connectAuthEmulator,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  connectFirestoreEmulator,
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { COLLECTIONS } from './constants'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
auth.setPersistence(browserLocalPersistence)

export const db = initializeFirestore(app, {
  localCache: useEmulators
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ...(useEmulators ? {} : { experimentalAutoDetectLongPolling: true }),
})

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export const questionsCollection = collection(db, COLLECTIONS.questions)
export const usersCollection = collection(db, COLLECTIONS.users)

export async function createQuestion(questionText: string, uid: string, displayName: string) {
  await addDoc(questionsCollection, {
    questionText,
    raisedByUid: uid,
    raisedByName: displayName,
    dateRaised: serverTimestamp(),
    status: 'open',
    replyText: null,
    replyByName: null,
    replyDate: null,
  })
}

export async function submitReply(questionId: string, replyText: string, replyByName: string) {
  await updateDoc(doc(db, COLLECTIONS.questions, questionId), {
    replyText,
    replyByName,
    replyDate: serverTimestamp(),
    status: 'answered',
  })
}

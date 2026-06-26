import { initializeApp } from 'firebase/app'
import {
  getAuth,
  browserLocalPersistence,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
// browserLocalPersistence is already the default in browser environments,
// set explicitly so "keep me signed in between visits" is documented intent
// rather than an implicit default a future maintainer might second-guess.
auth.setPersistence(browserLocalPersistence)

// persistentLocalCache enables offline reads/writes backed by IndexedDB and
// survives across tabs (persistentMultipleTabManager). experimentalAutoDetectLongPolling
// improves reliability of Firestore's realtime channel inside PWA/service-worker
// contexts and on networks with proxies that mishandle streaming connections.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  experimentalAutoDetectLongPolling: true,
})

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

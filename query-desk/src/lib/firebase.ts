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
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  connectStorageEmulator,
} from 'firebase/storage'
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

export const storage = getStorage(app)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}

export const questionsCollection = collection(db, COLLECTIONS.questions)
export const usersCollection = collection(db, COLLECTIONS.users)

/** Upload a file attachment and return its public download URL + original name. */
export async function uploadAttachment(
  uid: string,
  file: File,
): Promise<{ url: string; name: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `attachments/${uid}/${Date.now()}_${safeName}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, name: file.name }
}

export async function createQuestion(
  questionText: string,
  uid: string,
  displayName: string,
  attachment?: { url: string; name: string } | null,
) {
  const newDocRef = doc(questionsCollection)
  await setDoc(newDocRef, {
    questionText,
    raisedByUid: uid,
    raisedByName: displayName,
    dateRaised: serverTimestamp(),
    status: 'open',
    replyText: null,
    replyByName: null,
    replyDate: null,
    attachmentUrl: attachment?.url ?? null,
    attachmentName: attachment?.name ?? null,
    dueDate: null,
  })
}

export async function submitReply(
  questionId: string,
  replyText: string,
  replyByName: string,
  dueDate?: Date | null,
) {
  await updateDoc(doc(db, COLLECTIONS.questions, questionId), {
    replyText,
    replyByName,
    replyDate: serverTimestamp(),
    status: 'answered',
    dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
  })
}

/** Admin-only: set or clear the due date on any question without changing its status/reply. */
export async function setDueDate(questionId: string, dueDate: Date | null) {
  await updateDoc(doc(db, COLLECTIONS.questions, questionId), {
    dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
  })
}

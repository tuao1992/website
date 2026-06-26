import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { COLLECTIONS } from '../lib/constants'
import type { UserDoc } from '../types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  userDoc: UserDoc | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null)
  const [authResolved, setAuthResolved] = useState(false)
  const [userDocResolved, setUserDocResolved] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      setAuthResolved(true)
      if (!user) {
        setUserDoc(null)
        setUserDocResolved(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!firebaseUser) return
    setUserDocResolved(false)
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.users, firebaseUser.uid),
      (snapshot) => {
        const data = snapshot.data()
        setUserDoc(data ? (data as UserDoc) : null)
        setUserDocResolved(true)
      },
      () => setUserDocResolved(true),
    )
    return unsubscribe
  }, [firebaseUser])

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logout() {
    await signOut(auth)
  }

  async function changeOwnPassword(currentPassword: string, newPassword: string) {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error('Not signed in')
    }
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
    await reauthenticateWithCredential(auth.currentUser, credential)
    await updatePassword(auth.currentUser, newPassword)
  }

  const value: AuthContextValue = {
    firebaseUser,
    userDoc,
    loading: !authResolved || (!!firebaseUser && !userDocResolved),
    login,
    logout,
    changeOwnPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

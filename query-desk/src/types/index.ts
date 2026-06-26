import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'member'

export type View = 'open' | 'answered' | 'summary' | 'account'

export interface UserDoc {
  uid: string
  displayName: string
  email: string
  role: Role
}

export type QuestionStatus = 'open' | 'answered'

export interface Question {
  id: string
  questionText: string
  raisedByUid: string
  raisedByName: string
  dateRaised: Timestamp | null
  status: QuestionStatus
  replyText: string | null
  replyByName: string | null
  replyDate: Timestamp | null
}

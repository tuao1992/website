# Weldrite Query Desk

A small, mobile-first internal tool for Weldrite staff to post questions and
for the owner (Akshay) to answer them - replacing a shared spreadsheet with
per-user login and live, real-time sync across devices. Installable to a
phone home screen as a PWA, and works offline.

## Quick start (no Firebase account needed)

Run the full app locally in minutes using the Firebase Local Emulator Suite —
no Google account, no Firebase project, no `.env.local` file required.

```bash
npm install

# Terminal 1 — keep this running
npm run emulators
# Starts Auth on :9099, Firestore on :8080, Emulator UI on :4000
# Wait until you see "All emulators ready"

# Terminal 2
npm run seed:local    # creates the 9 accounts; prints their temp passwords
npm run dev           # open http://localhost:5173
```

Log in as **Akshay** (admin) or any other user using the temp password printed
by the seed script. The Emulator UI at <http://localhost:4000> shows live Auth
users and Firestore documents.

> **Note:** Emulator data is in-memory and resets each time you restart
> `npm run emulators`. Re-run `npm run seed:local` after each restart.
> This setup is for local development only — see sections below for deploying
> to a real Firebase project.

## Features

- **Questions & answers** — any staff member posts a question; Akshay (admin) answers it; status moves from Open → Answered live across all devices
- **Attachments** — attach one image, PDF, or text file per question (max 5 MB); stored in Firebase Storage; images display as a thumbnail inline
- **Due dates** — admin can set an optional target date when answering, or independently on open questions; members see a "Due {date}" badge on the Open list
- **Notifications** — enable browser notifications from your Account screen; you'll be notified when your question is answered (works while the PWA is open or backgrounded; see note below)
- **Offline support** — previously loaded data stays accessible with no connection; new questions/replies posted offline sync automatically when connectivity returns
- **PWA** — installable to phone home screen via "Add to Home Screen" on Android (Chrome) and iOS (Safari)

> **Push notification note**: browser notifications fire when the PWA is running (foreground or backgrounded). True background push — notification arriving when the app is fully closed — requires Firebase Cloud Messaging + a Cloud Function, which is outside the current stack (Hosting-only, no server). The notification permission and detection code are already in place; adding FCM server-side later is documented in Firebase's FCM docs.

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS v4
- Firebase Authentication (email/password)
- Cloud Firestore (real-time sync, offline persistence)
- Firebase Storage (attachments)
- Firebase Hosting
- PWA via `vite-plugin-pwa` (installable, offline-capable)

## Users & roles

9 fixed accounts, seeded once via script (never hardcoded in source):

| Name | Role |
|---|---|
| Akshay | admin |
| Riya, Priti, Pratiksha, Sonali, Shweta, Jyotsna, Akshada, Accounts | member |

Only the admin (Akshay) can answer or edit replies. Every user can change
their own password from the Account screen.

> **Note on emails**: the seed script uses placeholder emails like
> `riya@weldrite.app`. Confirm/replace the domain in
> `scripts/seedUsers.mjs` (the `EMAIL_DOMAIN` constant) with Weldrite's
> actual domain before seeding a production project.

## 1. Prerequisites

- Node.js 18+ and npm
- A Google account to create a Firebase project

## 2. Create the Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or reuse an existing one).
2. **Authentication**: go to *Build > Authentication > Sign-in method*, enable **Email/Password**.
3. **Firestore**: go to *Build > Firestore Database > Create database*. Choose **Production mode** and a region close to your users.
4. **Storage**: go to *Build > Storage > Get started*. Choose **Production mode**, same region as Firestore.
5. **Register a Web app**: go to *Project settings > General > Your apps*, click the web icon (`</>`), register an app (no Firebase Hosting setup needed at this step). Copy the resulting `firebaseConfig` values.

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with the values from the web app config you just copied:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

These values identify your Firebase project to the browser (not secret on
their own - access is governed by Firebase Auth + `firestore.rules`), but
are kept out of git so each environment can point at its own project.

Also update `.firebaserc` with your real project id (replace
`REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`).

## 4. Install and run locally

```bash
npm install
npm run dev
```

Open the printed local URL. You'll see the login screen - you need at
least one seeded account to sign in (next step).

## 5. Deploy Firestore security rules

Rules are in `firestore.rules`. Deploy them with the Firebase CLI (no
global install needed, `npx` downloads it on demand):

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

Do this **before** seeding/using the app against a real project, so it's
never left open in test mode.

## 6. Seed the 9 users

1. In the Firebase Console, go to *Project settings > Service accounts > Generate new private key*. Save the downloaded file as:
   ```
   query-desk/scripts/serviceAccountKey.json
   ```
   This file is gitignored and must never be committed.
2. Run the seed script:
   ```bash
   npm run seed
   ```
3. The script creates the 9 Firebase Auth accounts (skipping any that already exist) with freshly generated random temporary passwords, and writes/updates their `users/{uid}` Firestore docs. It prints a table of email/password pairs and also saves them to `scripts/seed-output.local.json` (gitignored).
4. Relay each temporary password to its owner out-of-band (in person, a private chat message, etc.) and ask them to sign in and change their password immediately via the **Account** screen.

Re-running `npm run seed` later is safe: it never overwrites an existing
account's password, it only re-syncs the `users` Firestore docs (e.g. if
you fix a typo in a display name).

## 7. Resetting a password later

- **Self-service** (any user, including Akshay): sign in, open the
  **Account** screen (tap your name in the header), enter your current
  password and a new one.
- **Admin-assisted reset for someone else**: there is intentionally **no
  in-app button** for this. Firebase's client SDK cannot change another
  user's password - that requires the Admin SDK and a service-account
  credential, and this project has no backend compute (Hosting only, no
  Cloud Functions) to safely expose that capability from the browser.
  Instead, run:
  ```bash
  npm run reset-password -- riya@weldrite.app
  ```
  This generates a new random temporary password, sets it via the Admin
  SDK, and prints it for you to relay to the user.

## 8. Build for production

```bash
npm run build
```

Output goes to `dist/`. Preview it locally with `npm run preview`.

## 9. Deploy to Firebase Hosting

```bash
npx firebase-tools deploy --only hosting,firestore:rules,firestore:indexes,storage
```

This prints a `https://<your-project>.web.app` URL - share that with staff.

## 10. Add to home screen

**Android (Chrome)**: open the URL, tap the **⋮** menu, choose **Add to
Home screen** / **Install app**.

**iPhone/iPad (Safari)**: open the URL, tap the **Share** icon, choose
**Add to Home Screen**. Note: the app must be reopened from the home
screen icon (not a bookmark) to run in full-screen "standalone" mode, and
iOS does not support push notifications for home-screen web apps.

## Offline behavior

Firestore's offline persistence (`persistentLocalCache`) keeps previously
loaded questions available and renders them instantly from a local
IndexedDB cache, even with no connection. New questions or replies created
while offline are queued locally and sync automatically the moment
connectivity returns - no manual action needed. Initial sign-in does
require connectivity.

## Project structure

```
src/
  lib/firebase.ts          Firebase app/auth/db setup, createQuestion/submitReply
  contexts/AuthContext.tsx Auth state, role resolution, password change
  hooks/                   useQuestions (real-time list), useUsers
  components/layout/       Header, BottomNav (mobile), TopTabs (desktop), AppShell
  components/questions/    QuestionCard, StatusBadge, AskQuestionForm, ReplyControl
  components/summary/      SummaryStats, OpenByPersonTable
  components/common/       LoadingSpinner, EmptyState, ErrorState, RefreshButton
  pages/                   LoginPage, OpenQuestionsPage, AnsweredQuestionsPage,
                            SummaryPage, AccountPage
scripts/
  seedUsers.mjs            One-time: create the 9 accounts
  resetPassword.mjs        Admin-run: reset one user's password
firestore.rules            Security rules (see below)
storage.rules              Firebase Storage security rules
```

## Security model (firestore.rules)

- Any signed-in user can read all questions and all user profiles (needed
  to display names), and can create a new question only as themselves
  with status forced to `open` and no reply fields.
- Only a user whose `users/{uid}` doc has `role == 'admin'` can update a
  question's reply fields/status (covers both answering and later editing
  a reply), or delete a question.
- `users/{uid}` docs are writable only by admin from the client (the seed
  and reset scripts use the Admin SDK, which bypasses rules entirely).

## Known limitations / decisions made

- **Email domain placeholder**: `weldrite.app` in `scripts/seedUsers.mjs` - replace with the real domain before production seeding.
- **No router**: only 4 screens, no deep links needed, so view switching is a simple `useState`, not `react-router`.
- **No Cloud Functions**: by design, per the specified stack (Hosting only). This is why admin-assisted password resets are a script, not an in-app button, and why push notifications only fire while the PWA is running (not when it is fully closed).
- **No pagination**: fine at this scale (a handful of staff, modest question volume); would need revisiting if question volume grows into the thousands.
- **No self-service "forgot password" email link**: could be added later via Firebase Auth's `sendPasswordResetEmail`, but requires the seeded email addresses to be real, deliverable inboxes.
- **Attachment type/size rules**: enforced both client-side (5 MB guard, `accept` attribute) and server-side in `storage.rules`. The Storage emulator does not enforce content-type rules, so test type validation against a real Firebase project.
- **One attachment per question**: by design. Adding more would require a subcollection or an array field — straightforward to extend if needed.

#!/usr/bin/env node
// One-time setup script: creates the 9 fixed Weldrite Query Desk accounts
// (Firebase Auth users + matching Firestore users/{uid} docs).
//
// Usage:
//   node scripts/seedUsers.mjs
//
// Safe to re-run: existing Auth accounts are never overwritten (passwords
// are not touched on re-run), only Firestore user docs are upserted. To
// reset a single user's password later, use scripts/resetPassword.mjs.

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createInterface } from 'readline/promises'
import { initAdminApp, generateTempPassword } from './lib/adminApp.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Email domain is a placeholder - confirm/replace with Weldrite's real
// domain before running against a production Firebase project.
const EMAIL_DOMAIN = 'weldrite.app'

const ROSTER = [
  { localPart: 'akshay', displayName: 'Akshay', role: 'admin' },
  { localPart: 'riya', displayName: 'Riya', role: 'member' },
  { localPart: 'priti', displayName: 'Priti', role: 'member' },
  { localPart: 'pratiksha', displayName: 'Pratiksha', role: 'member' },
  { localPart: 'sonali', displayName: 'Sonali', role: 'member' },
  { localPart: 'shweta', displayName: 'Shweta', role: 'member' },
  { localPart: 'jyotsna', displayName: 'Jyotsna', role: 'member' },
  { localPart: 'akshada', displayName: 'Akshada', role: 'member' },
  { localPart: 'accounts', displayName: 'Accounts', role: 'member' },
]

async function main() {
  const app = initAdminApp()
  const auth = app.auth()
  const db = app.firestore()

  console.log(`This will create/update ${ROSTER.length} users in Firebase project: ${app.options.projectId}`)
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  await rl.question('Press Enter to continue, or Ctrl+C to abort... ')
  rl.close()

  const results = []

  for (const { localPart, displayName, role } of ROSTER) {
    const email = `${localPart}@${EMAIL_DOMAIN}`
    let userRecord
    let tempPassword = null

    try {
      userRecord = await auth.getUserByEmail(email)
      console.log(`SKIP (already exists): ${email}`)
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err
      tempPassword = generateTempPassword()
      userRecord = await auth.createUser({ email, password: tempPassword, displayName })
      console.log(`CREATED: ${email}`)
    }

    await db.collection('users').doc(userRecord.uid).set(
      { uid: userRecord.uid, displayName, email, role },
      { merge: true },
    )

    results.push({
      email,
      displayName,
      role,
      tempPassword: tempPassword ?? '(unchanged, account already existed)',
    })
  }

  console.log('\n--- Result ---')
  for (const r of results) {
    console.log(`${r.email.padEnd(28)} ${r.role.padEnd(8)} ${r.tempPassword}`)
  }

  const outputPath = join(__dirname, 'seed-output.local.json')
  writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\nFull output (including temp passwords) written to:\n  ${outputPath}`)
  console.log(
    'This file is gitignored. Relay each temp password to its user out-of-band ' +
      '(e.g. verbally or via a private message), then have them change it on first login.',
  )
}

main().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})

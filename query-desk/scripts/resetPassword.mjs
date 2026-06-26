#!/usr/bin/env node
// Admin-assisted password reset for an existing Query Desk user.
//
// Firebase client SDKs cannot reset another user's password - that requires
// the Admin SDK and a service-account credential, which is exactly what this
// script provides. There is no in-app "reset another user's password"
// button by design (see README "Resetting a password" section).
//
// Usage:
//   node scripts/resetPassword.mjs riya@weldrite.app

import { initAdminApp, generateTempPassword } from './lib/adminApp.mjs'

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: node scripts/resetPassword.mjs <email>')
    process.exit(1)
  }

  const app = initAdminApp()
  const auth = app.auth()

  const userRecord = await auth.getUserByEmail(email)
  const newPassword = generateTempPassword()

  await auth.updateUser(userRecord.uid, { password: newPassword })

  console.log(`\nPassword reset for ${email}`)
  console.log(`New temporary password: ${newPassword}`)
  console.log('\nRelay this to the user out-of-band, and have them change it via the Account page after logging in.')
}

main().catch((err) => {
  console.error('Reset failed:', err)
  process.exit(1)
})

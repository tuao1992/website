import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { randomBytes } from 'crypto'
import admin from 'firebase-admin'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_KEY_PATH = join(__dirname, '..', 'serviceAccountKey.json')

export function initAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app()
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_KEY_PATH

  if (!existsSync(keyPath)) {
    console.error(
      `\nNo service account key found.\n\n` +
        `Download one from Firebase Console > Project Settings > Service Accounts\n` +
        `> Generate new private key, then either:\n` +
        `  - save it as scripts/serviceAccountKey.json, or\n` +
        `  - set GOOGLE_APPLICATION_CREDENTIALS to its path.\n`,
    )
    process.exit(1)
  }

  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'))

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })
}

export function generateTempPassword(length = 16) {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  const bytes = randomBytes(length)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

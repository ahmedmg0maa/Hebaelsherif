import 'server-only'

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let cachedAdminApp: App | null = null

function getRequiredFirebaseAdminConfig() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  const missingKeys: string[] = []

  if (!projectId) missingKeys.push('FIREBASE_ADMIN_PROJECT_ID')
  if (!clientEmail) missingKeys.push('FIREBASE_ADMIN_CLIENT_EMAIL')
  if (!privateKey) missingKeys.push('FIREBASE_ADMIN_PRIVATE_KEY')

  if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase admin environment variables: ${missingKeys.join(', ')}`)
  }

  return { projectId, clientEmail, privateKey }
}

export function getAdminApp() {
  if (cachedAdminApp) return cachedAdminApp

  const existingApp = getApps().find((app) => app.name === 'admin')

  if (existingApp) {
    cachedAdminApp = existingApp
    return cachedAdminApp
  }

  const { projectId, clientEmail, privateKey } = getRequiredFirebaseAdminConfig()

  cachedAdminApp = initializeApp(
    {
      credential: cert({ projectId, clientEmail, privateKey }),
    },
    'admin',
  )

  return cachedAdminApp
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

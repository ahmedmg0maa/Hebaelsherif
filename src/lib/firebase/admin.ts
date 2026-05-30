import 'server-only'

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let cachedAdminApp: App | null = null

type AdminConfig = {
  projectId: string
  clientEmail: string
  privateKey: string
}

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^['\"]|['\"]$/g, '')
}

function normalizePrivateKey(value: string | undefined) {
  return cleanEnvValue(value)?.replace(/\\n/g, '\n')
}

export function getFirebaseAdminConfigStatus() {
  const projectId = cleanEnvValue(process.env.FIREBASE_ADMIN_PROJECT_ID)
  const clientEmail = cleanEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY)

  const missingKeys: string[] = []

  if (!projectId) missingKeys.push('FIREBASE_ADMIN_PROJECT_ID')
  if (!clientEmail) missingKeys.push('FIREBASE_ADMIN_CLIENT_EMAIL')
  if (!privateKey) missingKeys.push('FIREBASE_ADMIN_PRIVATE_KEY')

  return {
    ready: missingKeys.length === 0,
    missingKeys,
    projectId,
    clientEmail,
    hasPrivateKey: Boolean(privateKey),
  }
}

function getRequiredFirebaseAdminConfig(): AdminConfig {
  const projectId = cleanEnvValue(process.env.FIREBASE_ADMIN_PROJECT_ID)
  const clientEmail = cleanEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL)
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY)

  const missingKeys: string[] = []

  if (!projectId) missingKeys.push('FIREBASE_ADMIN_PROJECT_ID')
  if (!clientEmail) missingKeys.push('FIREBASE_ADMIN_CLIENT_EMAIL')
  if (!privateKey) missingKeys.push('FIREBASE_ADMIN_PRIVATE_KEY')

  if (missingKeys.length > 0 || !projectId || !clientEmail || !privateKey) {
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

export function tryGetAdminDb() {
  try {
    return getAdminDb()
  } catch (error) {
    console.warn(
      '[firebase-admin] Firestore is unavailable in this runtime:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return null
  }
}

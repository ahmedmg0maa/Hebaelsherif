import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

function assertFirebaseClientConfig() {
  const requiredConfig = {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  }

  const missingKeys = Object.entries(requiredConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase client environment variables: ${missingKeys.join(', ')}`)
  }
}

function createFirebaseClientApp() {
  assertFirebaseClientConfig()
  return getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
}

const isBrowser = typeof window !== 'undefined'
const app: FirebaseApp | null = isBrowser ? createFirebaseClientApp() : null

export const auth = (app ? getAuth(app) : null) as Auth
export const db = (app ? getFirestore(app) : null) as Firestore

export async function getFirebaseAnalytics() {
  if (!app || typeof window === 'undefined') return null

  const supported = await isSupported()

  if (!supported) return null

  return getAnalytics(app)
}

export function getFirebaseClientApp() {
  if (!isBrowser) {
    throw new Error('Firebase client app can only be initialized in the browser.')
  }

  return createFirebaseClientApp()
}

export default app

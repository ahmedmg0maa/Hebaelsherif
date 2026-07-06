export interface User {
  uid: string
  email: string | null
  displayName?: string | null
  getIdToken(forceRefresh?: boolean): Promise<string>
}

export function getAuth() {
  return { currentUser: null as User | null }
}

export function onAuthStateChanged(_auth: unknown, callback: (user: User | null) => void) {
  callback(null)
  return () => undefined
}

export async function signOut() {
  return undefined
}

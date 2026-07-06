export class AuthCompatError extends Error {
  code: string
  customData?: Record<string, unknown>

  constructor(code = 'unknown', message = 'Supabase auth compatibility error', customData?: Record<string, unknown>) {
    super(message)
    this.name = 'AuthCompatError'
    this.code = code
    this.customData = customData
  }
}

export function initializeApp() {
  return { name: 'supabase-compat' }
}

export function getApps() {
  return []
}

export function getApp() {
  return { name: 'supabase-compat' }
}

export async function deleteApp() {
  return undefined
}

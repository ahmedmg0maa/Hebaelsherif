import 'server-only'

export function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

export function optionalText(value: unknown) {
  const result = text(value)
  return result || undefined
}

export function numberValue(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

export function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function stripUndefined(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
}

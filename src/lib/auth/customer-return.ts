// Share the exact customer destination policy between sign-in, registration
// and the server PKCE callback. Never accept an external or Admin destination.
export function customerReturnPath(value: string | null, fallback = '/dashboard'): string {
  if (!value || value.length > 250) return fallback
  return /^\/(?:booking|dashboard(?:\/[a-zA-Z0-9_-]+)*|checkout\/(?:course|book|workshop|bundle|vip|free_resource)\/[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(value) ? value : fallback
}

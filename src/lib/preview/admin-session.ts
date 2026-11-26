import 'server-only'

import { cookies, headers } from 'next/headers'

const COOKIE_NAME = 'heba-preview-admin'
const MAX_AGE_SECONDS = 8 * 60 * 60
const encoder = new TextEncoder()

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function textToBase64Url(value: string) {
  return bytesToBase64Url(encoder.encode(value))
}

function base64UrlToText(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index]
  return difference === 0
}

async function hmacKey() {
  const secret = process.env.HEBA_PREVIEW_ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) return null
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function sign(payload: string) {
  const key = await hmacKey()
  if (!key) return null
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))))
}

export function isPreviewAdminConfigured() {
  return process.env.HEBA_DEPLOYMENT_ENV === 'preview'
    && Boolean(process.env.HEBA_PREVIEW_ADMIN_EMAIL)
    && Boolean(process.env.HEBA_PREVIEW_ADMIN_PASSWORD)
    && (process.env.HEBA_PREVIEW_ADMIN_SESSION_SECRET?.length ?? 0) >= 32
}

export async function verifyPreviewAdminCredentials(candidateEmail: string, candidatePassword: string) {
  const expectedEmail = process.env.HEBA_PREVIEW_ADMIN_EMAIL
  const expectedPassword = process.env.HEBA_PREVIEW_ADMIN_PASSWORD
  if (!isPreviewAdminConfigured() || !expectedEmail || !expectedPassword || !candidateEmail || !candidatePassword) return false

  const [candidateEmailDigest, expectedEmailDigest, candidatePasswordDigest, expectedPasswordDigest] = await Promise.all([
    digest(candidateEmail.trim().toLowerCase()),
    digest(expectedEmail.trim().toLowerCase()),
    digest(candidatePassword),
    digest(expectedPassword),
  ])

  const emailMatches = sameBytes(candidateEmailDigest, expectedEmailDigest)
  const passwordMatches = sameBytes(candidatePasswordDigest, expectedPasswordDigest)
  return emailMatches && passwordMatches
}

export async function establishPreviewAdminSession() {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000
  const payload = textToBase64Url(JSON.stringify({ expiresAt }))
  const signature = await sign(payload)
  if (!signature) return false
  const requestHeaders = await headers()
  const secure = requestHeaders.get('x-forwarded-proto') === 'https' || requestHeaders.get('cf-visitor')?.includes('https') === true
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/preview-admin',
    maxAge: MAX_AGE_SECONDS,
  })
  return true
}

export async function hasPreviewAdminSession() {
  if (!isPreviewAdminConfigured()) return false
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return false
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return false
  const key = await hmacKey()
  if (!key) return false
  const valid = await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(signature.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(signature.length / 4) * 4, '=')), (character) => character.charCodeAt(0)), encoder.encode(payload))
  if (!valid) return false
  try {
    const parsed = JSON.parse(base64UrlToText(payload)) as { expiresAt?: unknown }
    return typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()
  } catch {
    return false
  }
}

export async function clearPreviewAdminSession() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'strict', path: '/preview-admin', maxAge: 0 })
}

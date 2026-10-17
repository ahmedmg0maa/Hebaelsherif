import {getUploadLimit} from '../uploads/limits.mjs'
const PDF = { mimes: ['application/pdf'], signature: 'pdf' }
const ZIP = { mimes: ['application/zip', 'application/x-zip-compressed'], signature: 'zip' }
const MP4 = { mimes: ['video/mp4'], signature: 'mp4' }
const WEBM = { mimes: ['video/webm'], signature: 'webm' }
const MOV = { mimes: ['video/quicktime'], signature: 'mp4' }
const MP3 = { mimes: ['audio/mpeg'], signature: 'mp3' }
const WAV = { mimes: ['audio/wav', 'audio/x-wav'], signature: 'wav' }
const M4A = { mimes: ['audio/mp4', 'audio/x-m4a'], signature: 'mp4' }

export const uploadRules = {
  book: { bucket: 'protected-books', max: getUploadLimit('protected-books'), extensions: { pdf: PDF, epub: { mimes: ['application/epub+zip'], signature: 'zip' } } },
  'lesson-video': { bucket: 'course-videos', max: getUploadLimit('course-videos'), extensions: { mp4: MP4, webm: WEBM, mov: MOV } },
  'lesson-resource': { bucket: 'course-resources', max: getUploadLimit('course-resources'), extensions: { pdf: PDF, zip: ZIP, mp3: MP3, wav: WAV, m4a: M4A } },
  'workshop-resource': { bucket: 'course-resources', max: getUploadLimit('course-resources'), extensions: { pdf: PDF, zip: ZIP, mp3: MP3, wav: WAV, m4a: M4A } },
  'workshop-recording': { bucket: 'workshop-recordings', max: getUploadLimit('workshop-recordings'), extensions: { mp4: MP4, webm: WEBM, mov: MOV } },
}

export function getUploadRule(kind) {
  return uploadRules[kind]
}

export function extensionOf(name) {
  return name.normalize('NFKC').toLowerCase().match(/\.([a-z0-9]{2,8})$/)?.[1] ?? ''
}

export function hasSignature(bytes, signature) {
  if (!(bytes instanceof Uint8Array)) return false
  const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end))
  if (signature === 'pdf') return ascii(0, 5) === '%PDF-'
  if (signature === 'zip') return ascii(0, 2) === 'PK' && [3, 5, 7].includes(bytes[2]) && [4, 6, 8].includes(bytes[3])
  if (signature === 'mp4') return ascii(4, 8) === 'ftyp'
  if (signature === 'webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  if (signature === 'wav') return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE'
  if (signature === 'mp3') return ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  return false
}

export function validateObservedFile({ rule, type, declaredMime, declaredSize, observed }) {
  return Boolean(
    rule && type && observed
    && Number.isSafeInteger(observed.size)
    && observed.size === declaredSize
    && observed.size > 0
    && observed.size <= rule.max
    && type.mimes.includes(declaredMime)
    && type.mimes.includes(observed.mime)
    && hasSignature(observed.bytes, type.signature),
  )
}

export async function inspectStoredObject(storage, bucket, path) {
  const { data, error } = await storage.from(bucket).createSignedUrl(path, 30)
  if (error || !data?.signedUrl) return null
  const response = await fetch(data.signedUrl, { headers: { Range: 'bytes=0-31' }, cache: 'no-store', signal: AbortSignal.timeout(10_000) }).catch(() => null)
  if (!response || response.status !== 206) return null
  const range = response.headers.get('content-range')?.match(/^bytes \d+-\d+\/(\d+)$/i)
  if (!range) return null
  const body = new Uint8Array(await response.arrayBuffer())
  if (body.length === 0 || body.length > 32) return null
  return { bytes: body, mime: (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase(), size: Number(range[1]) }
}

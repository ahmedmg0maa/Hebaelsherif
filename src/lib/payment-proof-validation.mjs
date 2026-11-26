const MAX_PAYMENT_PROOF_SIZE = 5 * 1024 * 1024

const supported = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
}

function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.slice(start, end))
}

export function paymentProofMimeSupported(mime) {
  return Object.hasOwn(supported, String(mime).toLowerCase())
}

export function paymentProofMagicValid(bytes, mime) {
  if (!(bytes instanceof Uint8Array)) return false
  const normalized = String(mime).toLowerCase()
  if (normalized === 'image/png') {
    return bytes.length >= 8
      && bytes[0] === 0x89
      && ascii(bytes, 1, 4) === 'PNG'
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  }
  if (normalized === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (normalized === 'image/webp') {
    return bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP'
  }
  return false
}

export function validateObservedPaymentProof({ declaredMime, declaredSize, observed }) {
  const normalized = String(declaredMime).toLowerCase()
  return Boolean(
    paymentProofMimeSupported(normalized)
    && Number.isSafeInteger(declaredSize)
    && declaredSize > 0
    && declaredSize <= MAX_PAYMENT_PROOF_SIZE
    && observed
    && observed.mime === normalized
    && observed.size === declaredSize
    && paymentProofMagicValid(observed.bytes, normalized),
  )
}

export { MAX_PAYMENT_PROOF_SIZE }

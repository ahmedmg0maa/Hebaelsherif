export type ReviewSubmission = {
  productId: string
  rating: number
  comment: string
  displayNameConsent: boolean
  publicationConsent: boolean
}

export type ReviewValidation =
  | { ok: true; value: ReviewSubmission }
  | { ok: false; error: string }

export function normalizeReviewSubmission(input: ReviewSubmission): ReviewValidation {
  const productId = input.productId.trim()
  const comment = input.comment.trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    return { ok: false, error: 'المنتج غير صالح.' }
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: 'اختاري تقييمًا صحيحًا.' }
  }
  if (comment.length < 10 || comment.length > 2000) {
    return { ok: false, error: 'اكتبي تجربة بين ١٠ و٢٠٠٠ حرف.' }
  }
  if (!input.publicationConsent) {
    return { ok: false, error: 'يلزم قبول مراجعة ونشر نص التجربة قبل الإرسال.' }
  }
  return { ok: true, value: { ...input, productId, comment } }
}

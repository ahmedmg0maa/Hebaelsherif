import 'server-only'

import type { ProductType } from '@/types'

export const privateContentFields = [
  'contentUrl',
  'contentURL',
  'protectedUrl',
  'protectedURL',
  'downloadUrl',
  'downloadURL',
  'fileUrl',
  'fileURL',
  'driveUrl',
  'driveURL',
  'driveFileUrl',
  'driveFileURL',
  'driveFolderUrl',
  'driveFolderURL',
  'googleDriveUrl',
  'googleDriveURL',
  'resourceUrl',
  'resourceURL',
  'videoUrl',
  'videoURL',
  'pdfUrl',
  'pdfURL',
  'secretUrl',
  'secretURL',
  'privateUrl',
  'privateURL',
  'accessUrl',
  'accessURL',
] as const

export function removePrivateContentFields<T extends Record<string, unknown>>(values: T) {
  const clone = { ...values }
  privateContentFields.forEach((field) => {
    delete clone[field]
  })
  return clone
}

export function hasPrivateContentLeak(values: Record<string, unknown> | null | undefined) {
  if (!values) return false
  return privateContentFields.some((field) => typeof values[field] === 'string' && String(values[field]).trim().length > 0)
}

export function getProductCollection(productType: ProductType) {
  return productType === 'course' ? 'courses' : 'books'
}

export function getProtectedContentId(productType: ProductType, productId: string) {
  return `${productType}_${productId}`
}

export function isProductType(value: unknown): value is ProductType {
  return value === 'course' || value === 'book'
}

export function buildProductReadiness(productType: ProductType, product: Record<string, unknown>, hasProtectedContent: boolean) {
  const status = String(product.status || 'draft')
  const price = Number(product.price || 0)
  const checks = [
    { key: 'title', label: 'العنوان', passed: Boolean(product.title) },
    { key: 'slug', label: 'الرابط المختصر', passed: Boolean(product.slug) },
    { key: 'description', label: 'الوصف', passed: Boolean(product.description || product.shortDescription) },
    { key: 'price', label: 'السعر أو قريبًا', passed: price > 0 || status === 'coming_soon' },
    { key: 'currency', label: 'العملة EGP', passed: !product.currency || product.currency === 'EGP' },
    { key: 'no_private_links', label: 'بدون روابط خاصة عامة', passed: !hasPrivateContentLeak(product) },
    { key: 'protected_content', label: productType === 'course' ? 'محتوى كورس محمي' : 'ملف كتاب محمي', passed: status !== 'published' || hasProtectedContent },
    { key: 'seo', label: 'SEO أساسي', passed: Boolean(product.seoTitle || product.title) && Boolean(product.seoDescription || product.shortDescription || product.description) },
  ]
  const passed = checks.filter((check) => check.passed).length
  return {
    checks,
    score: Math.round((passed / checks.length) * 100),
    missing: checks.filter((check) => !check.passed).map((check) => check.label),
  }
}

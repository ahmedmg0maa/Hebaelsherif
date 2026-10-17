// Byte contract shared by the two browser upload flows and server validation.
// The SQL migration is generated from this object and checked for drift.
export const UPLOAD_LIMITS = Object.freeze({
 'public-media': 10_485_760,
 'course-videos': 50_000_000,
 'course-resources': 50_000_000,
 'protected-books': 50_000_000,
 'workshop-recordings': 50_000_000,
})
export function getUploadLimit(bucket) { return UPLOAD_LIMITS[bucket] ?? 0 }
export function uploadSizeAllowed(bucket,size) { return Number.isSafeInteger(size)&&size>0&&size<=getUploadLimit(bucket) }
export function uploadLimitLabel(bucket) { return `${(getUploadLimit(bucket)/1_000_000).toLocaleString('ar-EG',{maximumFractionDigits:5})} ميجابايت` }

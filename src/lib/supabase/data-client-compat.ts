'use client'

import { createSupabaseBrowserClient } from './client'

type Constraint =
  | { kind: 'where'; field: string; op: string; value: unknown }
  | { kind: 'orderBy'; field: string; direction?: 'asc' | 'desc' }
  | { kind: 'limit'; count: number }

interface CollectionRef {
  type: 'collection'
  name: string
}

interface DocRef {
  type: 'doc'
  collectionName: string
  id: string
}

interface QueryRef {
  type: 'query'
  collectionRef: CollectionRef
  constraints: Constraint[]
}

const COLLECTION_MAP: Record<string, string> = {
  users: 'profiles',
  admin_logs: 'audit_logs',
  access_records: 'content_access',
}

function tableFor(collectionName: string) {
  return COLLECTION_MAP[collectionName] || collectionName
}

const ALLOWED_COLUMNS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries({
    profiles: ['id','full_name','email','phone','avatar_url','role','status','locale','created_at','updated_at','metadata'],
    bookings: ['id','user_id','service_id','service_title','customer_name','customer_email','customer_phone','date','start_time','end_time','start_at','end_at','duration_minutes','timezone','status','payment_status','payment_method','original_amount','discount_amount','final_amount','coupon_id','notes','admin_notes','meeting_url','cancellation_reason','metadata','created_at','updated_at'],
    orders: ['id','user_id','status','payment_status','payment_method','product_id','product_type','product_title','original_amount','discount_amount','final_amount','coupon_id','payment_reference','payment_proof_url','notes','metadata','created_at','updated_at'],
    books: ['id','slug','title_ar','subtitle_ar','description_ar','emotional_promise','price_egp','cover_url','sample_url','status','sort_order','seo_title','seo_description','metadata','created_at','updated_at'],
    reviews: ['id','user_id','display_name','rating','text','context','status','metadata','created_at','updated_at'],
    contact_messages: ['id','name','email','phone','topic','message','status','admin_note','metadata','created_at','updated_at'],
    newsletter_subscribers: ['id','email','name','status','source','metadata','created_at','updated_at'],
    notifications: ['id','user_id','audience','role','title','body','message','type','href','entity_type','entity_id','priority','is_read','read','status','metadata','created_at','updated_at','read_at','read_by'],
    analytics_events: ['id','user_id','session_id','event_name','page_path','metadata','created_at'],
    events: ['id','user_id','session_id','event_name','page_path','metadata','created_at','updated_at'],
    courses: ['id','slug','title_ar','subtitle_ar','description_ar','price_egp','cover_url','status','sort_order','metadata','created_at','updated_at'],
    course_lessons: ['id','course_id','title','description','stage_title','duration','sort_order','order','status','metadata','created_at','updated_at'],
    protected_content: ['id','product_id','product_type','content_url','resource_url','metadata','created_at','updated_at'],
    reading_progress: ['id','user_id','book_id','chapter','progress_percent','note','metadata','created_at','updated_at'],
    course_progress: ['id','user_id','course_id','lesson_id','progress_percent','metadata','created_at','updated_at'],
    leads: ['id','name','email','phone','status','source','admin_note','metadata','created_at','updated_at'],
    admin_tasks: ['id','title','description','status','priority','assigned_to','metadata','created_at','updated_at'],
    notification_templates: ['id','title','subject','body','type','status','metadata','created_at','updated_at'],
    payment_attempts: ['id','user_id','order_id','booking_id','amount','currency','method','reference','proof_url','status','confirmed_by','metadata','created_at','updated_at'],
    bookings_timeline: ['id','booking_id','action','title','by','note','metadata','created_at','updated_at'],
    orders_timeline: ['id','order_id','action','title','by','note','metadata','created_at','updated_at'],
    activity_timeline: ['id','user_id','action','title','note','metadata','created_at','updated_at'],
    customer_notes: ['id','user_id','admin_id','note','status','metadata','created_at','updated_at'],
    timeline: ['id','action','title','by','note','metadata','created_at','updated_at'],
  }).map(([table, columns]) => [table, new Set(columns)]),
)

function finalizePayload(collectionName: string, data: Record<string, unknown>) {
  const table = tableFor(collectionName)
  const allowed = ALLOWED_COLUMNS[table]
  if (!allowed) return data
  const payload: Record<string, unknown> = {}
  const metadata: Record<string, unknown> = { ...(data.metadata && typeof data.metadata === 'object' ? (data.metadata as Record<string, unknown>) : {}) }
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) payload[key] = value
    else metadata[key] = value
  }
  if (Object.keys(metadata).length > 0 && allowed.has('metadata')) payload.metadata = metadata
  return payload
}

function toDateCompat(value: unknown) {
  if (!value) return value
  if (value instanceof Date) return value
  if (typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) {
    const iso = value
    return {
      seconds: Math.floor(new Date(iso).getTime() / 1000),
      nanoseconds: 0,
      toDate: () => new Date(iso),
      toMillis: () => new Date(iso).getTime(),
      toJSON: () => iso,
    }
  }
  return value
}

function addAlias(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== undefined && target[key] === undefined) target[key] = value
}

function normalizeRow(collectionName: string, row: Record<string, unknown>) {
  const data: Record<string, unknown> = { ...((row.metadata && typeof row.metadata === 'object') ? (row.metadata as Record<string, unknown>) : {}), ...row }
  const created = row.created_at ?? row.createdAt
  const updated = row.updated_at ?? row.updatedAt
  addAlias(data, 'createdAt', toDateCompat(created))
  addAlias(data, 'updatedAt', toDateCompat(updated))

  if (collectionName === 'users' || collectionName === 'profiles') {
    addAlias(data, 'uid', row.id)
    addAlias(data, 'name', row.full_name)
    addAlias(data, 'createdAt', toDateCompat(created))
  }

  if (collectionName === 'bookings') {
    addAlias(data, 'userId', row.user_id)
    addAlias(data, 'name', row.customer_name)
    addAlias(data, 'customerName', row.customer_name)
    addAlias(data, 'email', row.customer_email)
    addAlias(data, 'customerEmail', row.customer_email)
    addAlias(data, 'phone', row.customer_phone)
    addAlias(data, 'customerPhone', row.customer_phone)
    addAlias(data, 'time', typeof row.start_time === 'string' ? row.start_time.slice(0, 5) : row.start_time)
    addAlias(data, 'duration', row.duration_minutes)
    addAlias(data, 'sessionType', row.service_title || row.title_ar || 'جلسة فردية')
    addAlias(data, 'paymentStatus', row.payment_status)
    addAlias(data, 'paymentMethod', row.payment_method)
    addAlias(data, 'originalPrice', row.original_amount)
    addAlias(data, 'discountAmount', row.discount_amount)
    addAlias(data, 'finalAmount', row.final_amount)
    addAlias(data, 'amount', row.final_amount)
    addAlias(data, 'adminNotes', row.admin_notes)
  }

  if (collectionName === 'orders') {
    addAlias(data, 'userId', row.user_id)
    addAlias(data, 'paymentStatus', row.payment_status)
    addAlias(data, 'paymentMethod', row.payment_method)
    addAlias(data, 'originalPrice', row.original_amount)
    addAlias(data, 'discountAmount', row.discount_amount)
    addAlias(data, 'finalAmount', row.final_amount)
    addAlias(data, 'amount', row.final_amount)
    addAlias(data, 'adminNote', row.notes)
  }

  if (collectionName === 'books') {
    addAlias(data, 'title', row.title_ar)
    addAlias(data, 'description', row.description_ar)
    addAlias(data, 'shortDescription', row.subtitle_ar)
    addAlias(data, 'emotionalPromise', row.subtitle_ar)
    addAlias(data, 'price', row.price_egp)
    addAlias(data, 'coverImageUrl', row.cover_url)
    addAlias(data, 'image', row.cover_url)
  }

  if (collectionName === 'courses') {
    addAlias(data, 'title', row.title_ar)
    addAlias(data, 'description', row.description_ar)
    addAlias(data, 'emotionalPromise', row.subtitle_ar)
    addAlias(data, 'price', row.price_egp)
    addAlias(data, 'coverImageUrl', row.cover_url)
  }

  if (collectionName === 'notifications') {
    if (data.userId && !data.user_id) data.user_id = data.userId
    if (data.message && !data.body) data.body = data.message
    if (data.read !== undefined && data.is_read === undefined) data.is_read = data.read
    if (data.readAt && !data.read_at) data.read_at = data.readAt
    if (data.readBy && !data.read_by) data.read_by = data.readBy
  }

  if (collectionName === 'access_records' || collectionName === 'content_access') {
    if (data.userId && !data.user_id) data.user_id = data.userId
    if (data.productId && !data.product_id) data.product_id = data.productId
    if (data.productType && !data.product_type) data.product_type = data.productType
    if (data.productType && !data.content_type) data.content_type = data.productType
    if (data.productId && !data.content_id && /^[0-9a-f-]{36}$/i.test(String(data.productId))) data.content_id = data.productId
    if (data.orderId && !data.order_id) data.order_id = data.orderId
    if (data.orderId && !data.source_order_id && /^[0-9a-f-]{36}$/i.test(String(data.orderId))) data.source_order_id = data.orderId
  }

  if (collectionName === 'reviews') {
    addAlias(data, 'userId', row.user_id)
    addAlias(data, 'userName', row.display_name)
    addAlias(data, 'content', row.text)
    addAlias(data, 'productType', row.context)
  }

  if (collectionName === 'contact_messages' || collectionName === 'leads' || collectionName === 'newsletter_subscribers') {
    addAlias(data, 'createdAt', toDateCompat(created))
  }

  return data
}

function normalizeWrite(collectionName: string, values: Record<string, unknown>) {
  const data: Record<string, unknown> = { ...values }

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'toDate' in (value as Record<string, unknown>)) {
      data[key] = (value as { toDate: () => Date }).toDate().toISOString()
    }
  }

  if (collectionName === 'users' || collectionName === 'profiles') {
    if (data.name && !data.full_name) data.full_name = data.name
    if (data.uid && !data.id) data.id = data.uid
  }

  if (collectionName === 'books') {
    if (data.title && !data.title_ar) data.title_ar = data.title
    if (data.description && !data.description_ar) data.description_ar = data.description
    if (data.shortDescription && !data.subtitle_ar) data.subtitle_ar = data.shortDescription
    if (data.price !== undefined && data.price_egp === undefined) data.price_egp = data.price
    if (data.coverImageUrl && !data.cover_url) data.cover_url = data.coverImageUrl
  }

  if (collectionName === 'courses') {
    if (data.title && !data.title_ar) data.title_ar = data.title
    if (data.description && !data.description_ar) data.description_ar = data.description
    if (data.price !== undefined && data.price_egp === undefined) data.price_egp = data.price
    if (data.coverImageUrl && !data.cover_url) data.cover_url = data.coverImageUrl
  }

  if (collectionName === 'notifications') {
    if (data.userId && !data.user_id) data.user_id = data.userId
    if (data.message && !data.body) data.body = data.message
    if (data.read !== undefined && data.is_read === undefined) data.is_read = data.read
    if (data.readAt && !data.read_at) data.read_at = data.readAt
    if (data.readBy && !data.read_by) data.read_by = data.readBy
  }

  if (collectionName === 'access_records' || collectionName === 'content_access') {
    if (data.userId && !data.user_id) data.user_id = data.userId
    if (data.productId && !data.product_id) data.product_id = data.productId
    if (data.productType && !data.product_type) data.product_type = data.productType
    if (data.productType && !data.content_type) data.content_type = data.productType
    if (data.productId && !data.content_id && /^[0-9a-f-]{36}$/i.test(String(data.productId))) data.content_id = data.productId
    if (data.orderId && !data.order_id) data.order_id = data.orderId
    if (data.orderId && !data.source_order_id && /^[0-9a-f-]{36}$/i.test(String(data.orderId))) data.source_order_id = data.orderId
  }

  if (collectionName === 'reviews') {
    if (data.userId && !data.user_id) data.user_id = data.userId
    if (data.userName && !data.display_name) data.display_name = data.userName
    if (data.content && !data.text) data.text = data.content
  }

  if (collectionName === 'bookings') {
    if (data.userId && !data.user_id) data.user_id = data.userId
    if (data.name && !data.customer_name) data.customer_name = data.name
    if (data.email && !data.customer_email) data.customer_email = data.email
    if (data.phone && !data.customer_phone) data.customer_phone = data.phone
    if (data.time && !data.start_time) data.start_time = data.time
    if (data.duration && !data.duration_minutes) data.duration_minutes = data.duration
    if (data.paymentStatus && !data.payment_status) data.payment_status = data.paymentStatus
    if (data.paymentMethod && !data.payment_method) data.payment_method = data.paymentMethod
    if (data.finalAmount !== undefined && data.final_amount === undefined) data.final_amount = data.finalAmount
    if (data.discountAmount !== undefined && data.discount_amount === undefined) data.discount_amount = data.discountAmount
    if (data.originalPrice !== undefined && data.original_amount === undefined) data.original_amount = data.originalPrice
    if (data.adminNotes && !data.admin_notes) data.admin_notes = data.adminNotes
  }


  if (collectionName === 'course_lessons') {
    if (data.courseId && !data.course_id) data.course_id = data.courseId
    if (data.stageTitle && !data.stage_title) data.stage_title = data.stageTitle
    if (data.order !== undefined && data.sort_order === undefined) data.sort_order = data.order
  }

  if (collectionName === 'reading_progress') {
    if (data.userId && !data.user_id) data.user_id = data.userId
    if (data.bookId && !data.book_id) data.book_id = data.bookId
    if (data.progressPercent !== undefined && data.progress_percent === undefined) data.progress_percent = data.progressPercent
  }

  if (collectionName === 'course_progress') {
    if (data.userId && !data.user_id) data.user_id = data.userId
    if (data.courseId && !data.course_id) data.course_id = data.courseId
    if (data.lessonId && !data.lesson_id) data.lesson_id = data.lessonId
    if (data.progressPercent !== undefined && data.progress_percent === undefined) data.progress_percent = data.progressPercent
  }

  if (data.createdAt && !data.created_at) data.created_at = data.createdAt
  if (data.updatedAt && !data.updated_at) data.updated_at = data.updatedAt
  delete data.createdAt
  delete data.updatedAt
  delete data.uid
  delete data.name
  delete data.customerName
  delete data.customerEmail
  delete data.customerPhone
  delete data.userId
  delete data.paymentStatus
  delete data.paymentMethod
  delete data.originalPrice
  delete data.discountAmount
  delete data.finalAmount
  delete data.adminNotes
  delete data.readAt
  delete data.readBy
  delete data.productId
  delete data.productType
  delete data.orderId
  delete data.courseId
  delete data.stageTitle
  delete data.bookId
  delete data.lessonId
  delete data.progressPercent
  return finalizePayload(collectionName, data)
}

export function collection(_db: unknown, name: string): CollectionRef {
  return { type: 'collection', name }
}

export function doc(dbOrCollection: unknown, collectionNameOrId: string, maybeId?: string): DocRef {
  if (typeof maybeId === 'string') {
    return { type: 'doc', collectionName: collectionNameOrId, id: maybeId }
  }
  const parent = dbOrCollection as CollectionRef
  return { type: 'doc', collectionName: parent.name, id: collectionNameOrId }
}

export function where(field: string, op: string, value: unknown): Constraint {
  return { kind: 'where', field, op, value }
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Constraint {
  return { kind: 'orderBy', field, direction }
}

export function limit(count: number): Constraint {
  return { kind: 'limit', count }
}

export function query(collectionRef: CollectionRef, ...constraints: Constraint[]): QueryRef {
  return { type: 'query', collectionRef, constraints }
}

function applyConstraint(builder: any, constraint: Constraint) {
  const fieldMap: Record<string, string> = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    userId: 'user_id',
    productId: 'product_id',
    productType: 'product_type',
    paymentStatus: 'payment_status',
    paymentMethod: 'payment_method',
    courseId: 'course_id',
    bookId: 'book_id',
    lessonId: 'lesson_id',
    orderId: 'order_id',
    bookingId: 'booking_id',
  }
  const field = fieldMap[constraint.kind === 'limit' ? '' : constraint.field] || (constraint.kind === 'limit' ? '' : constraint.field)

  if (constraint.kind === 'limit') return builder.limit(constraint.count)
  if (constraint.kind === 'orderBy') return builder.order(field, { ascending: constraint.direction !== 'desc' })
  if (constraint.kind === 'where') {
    if (constraint.op === '==') return builder.eq(field, constraint.value)
    if (constraint.op === '!=') return builder.neq(field, constraint.value)
    if (constraint.op === '>') return builder.gt(field, constraint.value)
    if (constraint.op === '>=') return builder.gte(field, constraint.value)
    if (constraint.op === '<') return builder.lt(field, constraint.value)
    if (constraint.op === '<=') return builder.lte(field, constraint.value)
    if (constraint.op === 'in' && Array.isArray(constraint.value)) return builder.in(field, constraint.value)
  }
  return builder
}

class CompatDocSnapshot {
  id: string
  private row: Record<string, unknown> | null
  private collectionName: string

  constructor(collectionName: string, id: string, row: Record<string, unknown> | null) {
    this.collectionName = collectionName
    this.id = id
    this.row = row
  }

  exists() {
    return Boolean(this.row)
  }

  data() {
    return this.row ? normalizeRow(this.collectionName, this.row) : {}
  }
}

class CompatQuerySnapshot {
  docs: CompatDocSnapshot[]
  empty: boolean
  size: number

  constructor(docs: CompatDocSnapshot[]) {
    this.docs = docs
    this.empty = docs.length === 0
    this.size = docs.length
  }
}

export async function getDocs(ref: CollectionRef | QueryRef) {
  const supabase = createSupabaseBrowserClient()
  const collectionName = ref.type === 'collection' ? ref.name : ref.collectionRef.name
  const table = tableFor(collectionName)
  let builder = supabase.from(table).select('*')

  if (ref.type === 'query') {
    for (const constraint of ref.constraints) builder = applyConstraint(builder, constraint)
  }

  const { data, error } = await builder
  if (error) throw error
  return new CompatQuerySnapshot((data || []).map((row: Record<string, unknown>) => new CompatDocSnapshot(collectionName, String(row.id), row)))
}

export async function getDoc(ref: DocRef) {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase.from(tableFor(ref.collectionName)).select('*').eq('id', ref.id).maybeSingle()
  if (error) throw error
  return new CompatDocSnapshot(ref.collectionName, ref.id, data as Record<string, unknown> | null)
}

export async function addDoc(ref: CollectionRef, values: Record<string, unknown>) {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase.from(tableFor(ref.name)).insert(normalizeWrite(ref.name, values)).select('id').single()
  if (error) throw error
  return { id: String(data.id), path: `${ref.name}/${data.id}` }
}

export async function setDoc(ref: DocRef, values: Record<string, unknown>, options?: { merge?: boolean }) {
  const supabase = createSupabaseBrowserClient()
  const payload = normalizeWrite(ref.collectionName, values)
  const { error } = await supabase.from(tableFor(ref.collectionName)).upsert({ ...payload, id: ref.id }, { ignoreDuplicates: false })
  if (error && !options?.merge) throw error
}

export async function updateDoc(ref: DocRef, values: Record<string, unknown>) {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from(tableFor(ref.collectionName)).update(normalizeWrite(ref.collectionName, values)).eq('id', ref.id)
  if (error) throw error
}

export async function deleteDoc(ref: DocRef) {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from(tableFor(ref.collectionName)).delete().eq('id', ref.id)
  if (error) throw error
}

export function serverTimestamp() {
  return new Date().toISOString()
}

export const Timestamp = {
  now: () => new Date().toISOString(),
  fromDate: (date: Date) => date.toISOString(),
}

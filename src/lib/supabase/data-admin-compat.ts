import { createSupabaseAdminClient } from './admin'

type WhereFilterOp = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'array-contains'
type Direction = 'asc' | 'desc'

type Constraint =
  | { kind: 'where'; field: string; op: WhereFilterOp; value: unknown }
  | { kind: 'orderBy'; field: string; direction: Direction }
  | { kind: 'limit'; count: number }

export type DocumentData = Record<string, unknown>
export type UpdateData<T = DocumentData> = Partial<T>
export type SupabaseAdminDb = SupabaseAdminDataCompat
export type Supabase = SupabaseAdminDataCompat
export type SupabaseDataAdmin = SupabaseAdminDataCompat
export type Transaction = {
  get: (ref: DocumentReference) => Promise<DocumentSnapshot>
  set: (ref: DocumentReference, data: DocumentData, options?: { merge?: boolean }) => Transaction
  update: (ref: DocumentReference, data: DocumentData) => Transaction
  delete: (ref: DocumentReference) => Transaction
}

const COLLECTION_MAP: Record<string, string> = {
  users: 'profiles',
  admin_logs: 'audit_logs',
  access_records: 'content_access',
}

const FIELD_MAP: Record<string, string> = {
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
  adminNotes: 'admin_notes',
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
    audit_logs: ['id','actor_id','actor_email','admin_id','admin_email','action','entity_type','entity_id','target_type','target_id','before_data','after_data','before','after','message','metadata','ip_address','user_agent','created_at'],
    content_access: ['id','user_id','content_type','content_id','product_id','product_type','order_id','source_order_id','status','granted_by','granted_at','expires_at','metadata','created_at'],
    payment_proofs: ['id','booking_id','order_id','user_id','method','reference','screenshot_path','proof_url','note','status','reviewed_by','reviewed_at','metadata','created_at'],
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

function finalizePayload(collectionName: string, data: DocumentData) {
  const table = tableFor(collectionName)
  const allowed = ALLOWED_COLUMNS[table]
  if (!allowed) return data
  const payload: DocumentData = {}
  const metadata: DocumentData = { ...(data.metadata && typeof data.metadata === 'object' ? (data.metadata as DocumentData) : {}) }
  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) payload[key] = value
    else metadata[key] = value
  }
  if (Object.keys(metadata).length > 0 && allowed.has('metadata')) payload.metadata = metadata
  return payload
}

function fieldFor(field: string) {
  return FIELD_MAP[field] || field
}

export class TimestampCompat {
  private value: Date

  constructor(value: Date = new Date()) {
    this.value = value
  }

  toDate() {
    return this.value
  }

  toMillis() {
    return this.value.getTime()
  }

  toJSON() {
    return this.value.toISOString()
  }

  static now() {
    return new TimestampCompat(new Date())
  }

  static fromDate(date: Date) {
    return new TimestampCompat(date)
  }
}

export const Timestamp = TimestampCompat

export const FieldValue = {
  serverTimestamp: () => new Date().toISOString(),
  arrayUnion: (...values: unknown[]) => ({ __op: 'arrayUnion', values }),
  arrayRemove: (...values: unknown[]) => ({ __op: 'arrayRemove', values }),
  increment: (value: number) => ({ __op: 'increment', value }),
  delete: () => ({ __op: 'delete' }),
}

function toDateCompat(value: unknown) {
  if (!value) return value
  if (value instanceof TimestampCompat) return value
  if (value instanceof Date) return TimestampCompat.fromDate(value)
  if (typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) return TimestampCompat.fromDate(new Date(value))
  return value
}

function addAlias(target: DocumentData, key: string, value: unknown) {
  if (value !== undefined && target[key] === undefined) target[key] = value
}

function normalizeRow(collectionName: string, row: DocumentData) {
  const data: DocumentData = { ...((row.metadata && typeof row.metadata === 'object') ? (row.metadata as DocumentData) : {}), ...row }
  const created = row.created_at ?? row.createdAt
  const updated = row.updated_at ?? row.updatedAt
  addAlias(data, 'createdAt', toDateCompat(created))
  addAlias(data, 'updatedAt', toDateCompat(updated))

  if (collectionName === 'users' || collectionName === 'profiles') {
    addAlias(data, 'uid', row.id)
    addAlias(data, 'name', row.full_name)
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
  }

  if (collectionName === 'courses') {
    addAlias(data, 'title', row.title_ar)
    addAlias(data, 'description', row.description_ar)
    addAlias(data, 'emotionalPromise', row.subtitle_ar)
    addAlias(data, 'price', row.price_egp)
    addAlias(data, 'coverImageUrl', row.cover_url)
  }


  if (collectionName === 'course_lessons') {
    addAlias(data, 'courseId', row.course_id)
    addAlias(data, 'stageTitle', row.stage_title)
    addAlias(data, 'order', row.sort_order ?? row.order)
  }

  if (collectionName === 'course_progress') {
    addAlias(data, 'userId', row.user_id)
    addAlias(data, 'courseId', row.course_id)
    addAlias(data, 'lastLessonId', row.lesson_id)
    addAlias(data, 'progressPercent', row.progress_percent)
    if (Array.isArray(data.completedLessonIds)) data.completedLessonIds = data.completedLessonIds.map(String)
    else addAlias(data, 'completedLessonIds', [])
    addAlias(data, 'lastViewedAt', toDateCompat(updated || created))
  }

  if (collectionName === 'admin_logs' || collectionName === 'audit_logs') {
    if (data.adminId && !data.actor_id) data.actor_id = data.adminId
    if (data.adminEmail && !data.actor_email) data.actor_email = data.adminEmail
    if (data.targetType && !data.entity_type) data.entity_type = data.targetType
    if (data.targetId && !data.entity_id) data.entity_id = data.targetId
    if (data.before && !data.before_data) data.before_data = data.before
    if (data.after && !data.after_data) data.after_data = data.after
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
    if (data.grantedBy && !data.granted_by) data.granted_by = data.grantedBy
    if (data.grantedAt && !data.granted_at) data.granted_at = data.grantedAt
  }

  if (collectionName === 'reviews') {
    addAlias(data, 'userId', row.user_id)
    addAlias(data, 'userName', row.display_name)
    addAlias(data, 'content', row.text)
    addAlias(data, 'productType', row.context)
  }

  return data
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof TimestampCompat) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object' && 'toDate' in (value as DocumentData)) {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return value
}

function normalizeWrite(collectionName: string, values: DocumentData) {
  const data: DocumentData = {}
  for (const [key, rawValue] of Object.entries(values || {})) {
    const value = normalizeValue(rawValue)
    if (value && typeof value === 'object' && '__op' in (value as DocumentData)) continue
    data[key] = value
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

  if (collectionName === 'admin_logs' || collectionName === 'audit_logs') {
    if (data.adminId && !data.actor_id) data.actor_id = data.adminId
    if (data.adminEmail && !data.actor_email) data.actor_email = data.adminEmail
    if (data.targetType && !data.entity_type) data.entity_type = data.targetType
    if (data.targetId && !data.entity_id) data.entity_id = data.targetId
    if (data.before && !data.before_data) data.before_data = data.before
    if (data.after && !data.after_data) data.after_data = data.after
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
    if (data.grantedBy && !data.granted_by) data.granted_by = data.grantedBy
    if (data.grantedAt && !data.granted_at) data.granted_at = data.grantedAt
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

  const legacyKeys = ['createdAt','updatedAt','uid','name','customerName','customerEmail','customerPhone','userId','paymentStatus','paymentMethod','originalPrice','discountAmount','finalAmount','adminNotes','adminId','adminEmail','targetType','targetId','readAt','readBy','productId','productType','orderId','grantedBy','grantedAt','courseId','stageTitle','bookId','lessonId','progressPercent']
  for (const key of legacyKeys) delete data[key]
  return finalizePayload(collectionName, data)
}

export class DocumentSnapshot {
  id: string
  private collectionName: string
  private row: DocumentData | null

  ref: DocumentReference

  constructor(collectionName: string, id: string, row: DocumentData | null) {
    this.collectionName = collectionName
    this.id = id
    this.row = row
    this.ref = new DocumentReference(collectionName, id)
  }

  get exists() {
    return Boolean(this.row)
  }

  data(): DocumentData {
    return this.row ? normalizeRow(this.collectionName, this.row) : {}
  }
}

export class QuerySnapshot {
  docs: DocumentSnapshot[]
  empty: boolean
  size: number

  constructor(docs: DocumentSnapshot[]) {
    this.docs = docs
    this.empty = docs.length === 0
    this.size = docs.length
  }
}

export class DocumentReference {
  collectionName: string
  id: string

  constructor(collectionName: string, id: string) {
    this.collectionName = collectionName
    this.id = id
  }

  async get() {
    const { data, error } = await createSupabaseAdminClient().from(tableFor(this.collectionName)).select('*').eq('id', this.id).maybeSingle()
    if (error) throw error
    return new DocumentSnapshot(this.collectionName, this.id, data as DocumentData | null)
  }

  async set(data: DocumentData, options?: { merge?: boolean }) {
    const payload = { ...normalizeWrite(this.collectionName, data), id: this.id }
    const { error } = await createSupabaseAdminClient().from(tableFor(this.collectionName)).upsert(payload, { ignoreDuplicates: false })
    if (error) throw error
    return { writeTime: Timestamp.now() }
  }

  async update(data: DocumentData) {
    const payload = normalizeWrite(this.collectionName, data)
    const { error } = await createSupabaseAdminClient().from(tableFor(this.collectionName)).update(payload).eq('id', this.id)
    if (error) throw error
    return { writeTime: Timestamp.now() }
  }

  async delete() {
    const { error } = await createSupabaseAdminClient().from(tableFor(this.collectionName)).delete().eq('id', this.id)
    if (error) throw error
    return { writeTime: Timestamp.now() }
  }

  collection(name: string) {
    const subName = `${this.collectionName}_${name}`
    return new CollectionReference(subName)
  }
}

export class CollectionReference {
  name: string
  constraints: Constraint[]

  constructor(name: string, constraints: Constraint[] = []) {
    this.name = name
    this.constraints = constraints
  }

  doc(id?: string) {
    return new DocumentReference(this.name, id || crypto.randomUUID())
  }

  where(field: string, op: WhereFilterOp, value: unknown) {
    return new CollectionReference(this.name, [...this.constraints, { kind: 'where', field, op, value }])
  }

  orderBy(field: string, direction: Direction = 'asc') {
    return new CollectionReference(this.name, [...this.constraints, { kind: 'orderBy', field, direction }])
  }

  limit(count: number) {
    return new CollectionReference(this.name, [...this.constraints, { kind: 'limit', count }])
  }

  async get() {
    let builder = createSupabaseAdminClient().from(tableFor(this.name)).select('*')
    for (const constraint of this.constraints) {
      if (constraint.kind === 'limit') builder = builder.limit(constraint.count)
      if (constraint.kind === 'orderBy') builder = builder.order(fieldFor(constraint.field), { ascending: constraint.direction !== 'desc' })
      if (constraint.kind === 'where') {
        const field = fieldFor(constraint.field)
        if (constraint.op === '==') builder = builder.eq(field, constraint.value)
        else if (constraint.op === '!=') builder = builder.neq(field, constraint.value)
        else if (constraint.op === '>') builder = builder.gt(field, constraint.value)
        else if (constraint.op === '>=') builder = builder.gte(field, constraint.value)
        else if (constraint.op === '<') builder = builder.lt(field, constraint.value)
        else if (constraint.op === '<=') builder = builder.lte(field, constraint.value)
        else if (constraint.op === 'in' && Array.isArray(constraint.value)) builder = builder.in(field, constraint.value)
      }
    }
    const { data, error } = await builder
    if (error) throw error
    return new QuerySnapshot((data || []).map((row: DocumentData) => new DocumentSnapshot(this.name, String(row.id), row)))
  }

  async add(data: DocumentData) {
    const { data: inserted, error } = await createSupabaseAdminClient().from(tableFor(this.name)).insert(normalizeWrite(this.name, data)).select('id').single()
    if (error) throw error
    return new DocumentReference(this.name, String(inserted.id))
  }
}

class WriteBatchCompat {
  private operations: Array<() => Promise<unknown>> = []

  set(ref: DocumentReference, data: DocumentData, options?: { merge?: boolean }) {
    this.operations.push(() => ref.set(data, options))
    return this
  }

  update(ref: DocumentReference, data: DocumentData) {
    this.operations.push(() => ref.update(data))
    return this
  }

  delete(ref: DocumentReference) {
    this.operations.push(() => ref.delete())
    return this
  }

  async commit() {
    await Promise.all(this.operations.map((operation) => operation()))
  }
}

export class SupabaseAdminDataCompat {
  collection(name: string) {
    return new CollectionReference(name)
  }

  batch() {
    return new WriteBatchCompat()
  }

  async runTransaction<T>(handler: (transaction: Transaction) => Promise<T>) {
    const batch = new WriteBatchCompat()
    const tx: Transaction = {
      get: (ref) => ref.get(),
      set: (ref, data, options) => {
        batch.set(ref, data, options)
        return tx
      },
      update: (ref, data) => {
        batch.update(ref, data)
        return tx
      },
      delete: (ref) => {
        batch.delete(ref)
        return tx
      },
    }
    const result = await handler(tx)
    await batch.commit()
    return result
  }
}

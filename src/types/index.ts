export type AdminRole = 'owner' | 'admin' | 'super_admin' | 'support' | 'content_manager' | 'finance' | 'viewer'
export type UserRole = 'user' | AdminRole

export type PublishStatus = 'published' | 'draft' | 'review' | 'coming_soon' | 'hidden' | 'archived'
export type ProductType = 'course' | 'book'
export type OrderStatus = 'pending' | 'awaiting_payment' | 'payment_submitted' | 'paid' | 'access_granted' | 'rejected' | 'failed' | 'refunded' | 'cancelled'
export type PaymentStatus = 'not_required' | 'pending' | 'submitted' | 'confirmed' | 'failed' | 'refunded'
export type PaymentMethod = 'instapay' | 'vodafone_cash' | 'bank_transfer' | 'manual'
export type BookingStatus = 'pending' | 'awaiting_payment' | 'payment_submitted' | 'confirmed' | 'reschedule_requested' | 'cancelled' | 'completed' | 'no_show'
export type BookingDuration = 60 | 90
export type FirestoreDate = Date | { toDate: () => Date }

export interface User {
  uid: string
  name: string
  email: string
  phone?: string
  role: UserRole
  tags?: string[]
  leadScore?: number
  lastContactAt?: FirestoreDate
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface Course {
  id: string
  title: string
  slug: string
  description: string
  emotionalPromise: string
  outcomes: string[]
  targetAudience: string
  duration: string
  lessonsCount: number
  price: number
  status: PublishStatus
  coverImageUrl: string
  coverImage?: string
  image?: string
  imageAlt?: string
  previewVideoUrl?: string
  heroImageUrl?: string
  ogImageUrl?: string
  category?: string
  level?: string
  rating?: number
  studentsCount?: number
  seoTitle?: string
  seoDescription?: string
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface Lesson {
  id: string
  courseId: string
  stageTitle: string
  title: string
  description: string
  duration: number
  contentUrl?: string
  resourceUrl?: string
  order: number
  status?: PublishStatus
  isPreview?: boolean
  createdAt?: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface Book {
  id: string
  title: string
  slug: string
  description: string
  shortDescription: string
  emotionalPromise: string
  price: number
  status: PublishStatus
  coverImageUrl: string
  coverImage?: string
  image?: string
  sampleUrl?: string
  heroImageUrl?: string
  ogImageUrl?: string
  category?: string
  pagesCount?: number
  rating?: number
  seoTitle?: string
  seoDescription?: string
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface Booking {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  date: string
  time: string
  duration: BookingDuration
  status: BookingStatus
  notes?: string
  sessionType?: string
  price?: number
  originalPrice?: number
  amount?: number
  discountAmount?: number
  finalAmount?: number
  couponCode?: string
  paymentMethod?: PaymentMethod
  paymentReference?: string
  paymentProofUrl?: string
  paymentNote?: string
  paymentStatus?: PaymentStatus
  meetingUrl?: string
  adminNotes?: string
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface Order {
  id: string
  userId: string
  productId: string
  productType: ProductType
  productTitle?: string
  productSlug?: string
  userEmail?: string
  userName?: string
  amount: number
  currency?: 'EGP'
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paymentReference?: string
  paymentProofUrl?: string
  paymentNote?: string
  paymentStatus?: Exclude<PaymentStatus, 'not_required'>
  adminNote?: string
  couponCode?: string
  discountAmount?: number
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface CourseProgress {
  userId: string
  courseId: string
  completedLessonIds: string[]
  lastLessonId?: string
  progressPercent: number
  notes?: Record<string, string>
  bookmarks?: string[]
  lastViewedAt: FirestoreDate
}

export interface BookProgress {
  userId: string
  bookId: string
  progressPercent: number
  currentChapter?: string
  bookmarks?: string[]
  notes?: string
  lastViewedAt: FirestoreDate
}

export interface Review {
  id: string
  userId: string
  userName: string
  productId: string
  productType: ProductType
  rating: number
  content: string
  status: 'published' | 'approved' | 'pending' | 'rejected' | 'hidden'
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface ProtectedContent {
  id?: string
  productId: string
  productSlug?: string
  productType: ProductType
  title?: string
  contentUrl: string
  resourceUrl?: string
  accessType?: 'paid' | 'manual' | 'membership'
  isActive?: boolean
  createdAt?: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface AdminStats {
  revenue: number
  paidOrders: number
  pendingOrders: number
  pendingBookings: number
  confirmedBookings: number
  publishedCourses: number
  publishedBooks: number
}

export interface SelectOption<TValue extends string | number = string> {
  label: string
  value: TValue
}

export interface ApiErrorResponse { error: string }
export interface ApiSuccessResponse<TData = unknown> { success: true; data?: TData }

export interface AdminLog {
  id: string
  adminId: string
  adminEmail?: string
  adminRole?: AdminRole
  action: string
  targetType: string
  targetId?: string
  entityType?: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  message?: string
  createdAt: FirestoreDate
}

export interface AccessRecord {
  id: string
  userId: string
  orderId?: string
  productId: string
  productType: ProductType
  status: 'active' | 'revoked'
  grantedAt: FirestoreDate
  grantedBy?: string
  revokedAt?: FirestoreDate
}

export interface Lead {
  id: string
  email: string
  source: string
  status: 'new' | 'read' | 'replied' | 'important' | 'archived' | 'contacted' | 'converted'
  createdAt: FirestoreDate
  name?: string
  phone?: string
  interest?: string
  score?: number
  tags?: string[]
}

export type NotificationAudience = 'admin' | 'user' | 'all'
export interface AdminNotification {
  id: string
  userId?: string
  audience: NotificationAudience
  type: string
  title: string
  body: string
  message?: string
  href?: string
  status: 'unread' | 'read' | 'archived'
  read?: boolean
  priority?: 'low' | 'normal' | 'high' | 'critical'
  createdAt: FirestoreDate
  readAt?: FirestoreDate
}

export interface NotificationItem extends AdminNotification {}

export interface AnalyticsEvent {
  id: string
  name: string
  source?: string
  path?: string
  userId?: string
  sessionId?: string
  payload?: Record<string, unknown>
  metadata?: Record<string, unknown>
  createdAt: FirestoreDate
}

export interface PaymentAttempt {
  id: string
  orderId?: string
  bookingId?: string
  userId: string
  amount: number
  currency: 'EGP'
  method: PaymentMethod
  provider?: 'manual' | 'paymob' | 'stripe'
  reference?: string
  proofUrl?: string
  status: 'pending' | 'submitted' | 'confirmed' | 'failed' | 'refunded'
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface CustomerNote {
  id: string
  userId: string
  note: string
  tags?: string[]
  priority?: 'normal' | 'important'
  createdBy?: string
  createdAt: FirestoreDate
}

export interface AdminTask {
  id: string
  title: string
  description?: string
  status: 'open' | 'in_progress' | 'done' | 'archived'
  priority: 'low' | 'normal' | 'high' | 'critical'
  relatedType?: 'order' | 'booking' | 'user' | 'message' | 'course' | 'book' | 'system'
  relatedId?: string
  dueAt?: FirestoreDate
  assignedTo?: string
  createdBy?: string
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface EmailTemplate {
  id?: string
  key: string
  subject: string
  body: string
  status?: 'enabled' | 'disabled'
  ctaLabel?: string
  ctaHref?: string
  updatedAt?: FirestoreDate
}

export interface ActivityTimelineItem {
  id: string
  entityType: string
  entityId: string
  action: string
  label: string
  description?: string
  adminId?: string
  adminEmail?: string
  createdAt: FirestoreDate
}

export interface SupportTicket {
  id: string
  userId?: string
  name: string
  email: string
  subject: string
  message: string
  status: 'new' | 'open' | 'pending' | 'resolved' | 'archived'
  priority: 'low' | 'normal' | 'high'
  category?: string
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface SystemHealthCheck {
  key: string
  label: string
  status: 'ok' | 'warning' | 'critical'
  description: string
}

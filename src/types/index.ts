export type UserRole = 'user' | 'admin'

export type PublishStatus = 'published' | 'draft'

export type ProductType = 'course' | 'book'

export type OrderStatus = 'pending' | 'payment_submitted' | 'paid' | 'failed' | 'refunded' | 'cancelled'

export type PaymentMethod = 'instapay' | 'vodafone_cash' | 'bank_transfer' | 'manual'

export type BookingStatus = 'pending' | 'payment_submitted' | 'confirmed' | 'reschedule_requested' | 'cancelled' | 'completed'

export type BookingDuration = 60 | 90

export type FirestoreDate = Date | { toDate: () => Date }

export interface User {
  uid: string
  name: string
  email: string
  phone?: string
  role: UserRole
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
  driveFolderUrl?: string
  previewVideoUrl?: string
  heroImageUrl?: string
  ogImageUrl?: string
  category?: string
  level?: string
  rating?: number
  studentsCount?: number
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
  driveFileUrl?: string
  sampleUrl?: string
  heroImageUrl?: string
  ogImageUrl?: string
  category?: string
  pagesCount?: number
  rating?: number
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
  discountAmount?: number
  finalAmount?: number
  couponCode?: string
  paymentMethod?: PaymentMethod
  paymentReference?: string
  paymentNote?: string
  paymentStatus?: 'not_required' | 'pending' | 'submitted' | 'confirmed' | 'failed'
  meetingUrl?: string
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface Order {
  id: string
  userId: string
  productId: string
  productType: ProductType
  amount: number
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paymentReference?: string
  paymentProofUrl?: string
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
  status: 'published' | 'pending' | 'hidden'
  createdAt: FirestoreDate
  updatedAt?: FirestoreDate
}

export interface ProtectedContent {
  productId: string
  productType: ProductType
  contentUrl: string
  resourceUrl?: string
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

export interface ApiErrorResponse {
  error: string
}

export interface ApiSuccessResponse<TData = unknown> {
  success: true
  data?: TData
}

export interface AdminLog {
  id: string
  adminId: string
  action: string
  targetType: string
  targetId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  createdAt: FirestoreDate
}

export interface Coupon {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  active: boolean
  expiresAt?: FirestoreDate
  expiresAtText?: string
  usageLimit?: number
  usageCount?: number
  minAmount?: number
  scope?: 'all' | 'sessions' | 'courses' | 'books'
  notes?: string
}

export interface Lead {
  id: string
  email: string
  source: string
  status: 'new' | 'contacted' | 'converted'
  createdAt: FirestoreDate
}

export type UserRole = 'user' | 'admin'

export type PublishStatus = 'published' | 'draft'

export type ProductType = 'course' | 'book'

export type OrderStatus = 'pending' | 'paid' | 'cancelled'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

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
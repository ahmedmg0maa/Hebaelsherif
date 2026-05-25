import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Course, Lesson } from '@/types'

type CourseDocumentData = Record<string, unknown>

function serializePublicCourse(id: string, data: CourseDocumentData): Course {
  const {
    driveFolderUrl: _driveFolderUrl,
    contentUrl: _contentUrl,
    resourceUrl: _resourceUrl,
    privateUrl: _privateUrl,
    protectedUrl: _protectedUrl,
    ...publicData
  } = data

  return {
    id,
    ...publicData,
  } as Course
}

export async function getPublishedCourses(): Promise<Course[]> {
  const coursesQuery = query(
    collection(db, 'courses'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
  )

  const snapshot = await getDocs(coursesQuery)

  return snapshot.docs.map((docItem) => serializePublicCourse(docItem.id, docItem.data()))
}

export async function getFeaturedCourses(maxCount = 3): Promise<Course[]> {
  const coursesQuery = query(
    collection(db, 'courses'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(maxCount),
  )

  const snapshot = await getDocs(coursesQuery)

  return snapshot.docs.map((docItem) => serializePublicCourse(docItem.id, docItem.data()))
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const courseQuery = query(
    collection(db, 'courses'),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1),
  )

  const snapshot = await getDocs(courseQuery)

  if (snapshot.empty) return null

  const firstDoc = snapshot.docs[0]

  return serializePublicCourse(firstDoc.id, firstDoc.data())
}

export async function getCourseLessons(courseId: string, token?: string): Promise<Lesson[]> {
  if (!courseId) return []

  const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/lessons`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  })

  if (!response.ok) return []

  const data = (await response.json()) as { lessons?: Lesson[] }
  return Array.isArray(data.lessons) ? data.lessons : []
}

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

export async function getPublishedCourses(): Promise<Course[]> {
  const coursesQuery = query(
    collection(db, 'courses'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
  )

  const snapshot = await getDocs(coursesQuery)

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  })) as Course[]
}

export async function getFeaturedCourses(maxCount = 3): Promise<Course[]> {
  const coursesQuery = query(
    collection(db, 'courses'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(maxCount),
  )

  const snapshot = await getDocs(coursesQuery)

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  })) as Course[]
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

  return {
    id: firstDoc.id,
    ...firstDoc.data(),
  } as Course
}

export async function getCourseLessons(courseId: string): Promise<Lesson[]> {
  const lessonsQuery = query(
    collection(db, 'course_lessons'),
    where('courseId', '==', courseId),
    orderBy('order', 'asc'),
  )

  const snapshot = await getDocs(lessonsQuery)

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  })) as Lesson[]
}
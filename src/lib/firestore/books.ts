import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Book } from '@/types'

export async function getPublishedBooks(): Promise<Book[]> {
  const booksQuery = query(
    collection(db, 'books'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
  )

  const snapshot = await getDocs(booksQuery)

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  })) as Book[]
}

export async function getFeaturedBooks(maxCount = 3): Promise<Book[]> {
  const booksQuery = query(
    collection(db, 'books'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(maxCount),
  )

  const snapshot = await getDocs(booksQuery)

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  })) as Book[]
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  const bookQuery = query(
    collection(db, 'books'),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1),
  )

  const snapshot = await getDocs(bookQuery)

  if (snapshot.empty) return null

  const firstDoc = snapshot.docs[0]

  return {
    id: firstDoc.id,
    ...firstDoc.data(),
  } as Book
}
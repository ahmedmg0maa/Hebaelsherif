import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { apiErrorMessage, apiErrorStatus, privateContentFields, requireAdmin } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

function findLeaks(id: string, data: Record<string, unknown>, collectionName: string) {
  return privateContentFields
    .filter((field) => typeof data[field] === 'string' && String(data[field]).trim().length > 0)
    .map((field) => ({ collectionName, id, field }))
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req, 'content:write')
    const db = getAdminDb()
    const [courses, books, lessons, protectedContent] = await Promise.all([
      db.collection('courses').limit(300).get(),
      db.collection('books').limit(300).get(),
      db.collection('course_lessons').limit(500).get(),
      db.collection('protected_content').limit(500).get(),
    ])

    const leaks = [
      ...courses.docs.flatMap((docItem) => findLeaks(docItem.id, docItem.data(), 'courses')),
      ...books.docs.flatMap((docItem) => findLeaks(docItem.id, docItem.data(), 'books')),
      ...lessons.docs.flatMap((docItem) => findLeaks(docItem.id, docItem.data(), 'course_lessons')),
    ]

    const protectedKeys = new Set(protectedContent.docs.map((docItem) => docItem.id))
    const missingProtected = [
      ...courses.docs
        .filter((docItem) => docItem.data().status === 'published' && !protectedKeys.has(`course_${docItem.id}`))
        .map((docItem) => ({ collectionName: 'courses', id: docItem.id, title: docItem.data().title || docItem.id })),
      ...books.docs
        .filter((docItem) => docItem.data().status === 'published' && !protectedKeys.has(`book_${docItem.id}`))
        .map((docItem) => ({ collectionName: 'books', id: docItem.id, title: docItem.data().title || docItem.id })),
    ]

    return NextResponse.json({
      success: true,
      safe: leaks.length === 0 && missingProtected.length === 0,
      leaks,
      missingProtected,
    })
  } catch (error) {
    console.error('Security audit error:', error)
    return NextResponse.json({ error: apiErrorMessage(error) }, { status: apiErrorStatus(error) })
  }
}

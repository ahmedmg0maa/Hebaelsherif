import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess, requireAdmin } from '@/lib/server/admin-api'
import { hasPrivateContentLeak, hasProtectedContentFor } from '@/lib/admin/operations'

export const dynamic = 'force-dynamic'

function mapDocs(snapshot: FirebaseFirestore.QuerySnapshot) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })) as Array<Record<string, unknown>>
}

export async function GET(req: NextRequest) {
  try {
    const { error, context } = await requireAdmin(req, ['owner', 'admin', 'super_admin', 'content_manager', 'viewer'])
    if (error || !context) return error

    const [coursesSnap, booksSnap, lessonsSnap, protectedSnap] = await Promise.all([
      context.db.collection('courses').get(),
      context.db.collection('books').get(),
      context.db.collection('course_lessons').get(),
      context.db.collection('protected_content').get(),
    ])

    const courses = mapDocs(coursesSnap)
    const books = mapDocs(booksSnap)
    const lessons = mapDocs(lessonsSnap)
    const protectedItems = mapDocs(protectedSnap)

    const leakedCourses = courses.filter((item) => hasPrivateContentLeak(item))
    const leakedBooks = books.filter((item) => hasPrivateContentLeak(item))
    const leakedLessons = lessons.filter((item) => hasPrivateContentLeak(item))
    const publishedCoursesWithoutContent = courses.filter((item) => item.status === 'published' && !hasProtectedContentFor('course', item, protectedItems))
    const publishedBooksWithoutContent = books.filter((item) => item.status === 'published' && !hasProtectedContentFor('book', item, protectedItems))
    const orphanProtected = protectedItems.filter((item) => {
      const productType = String(item.productType || '')
      const productId = String(item.productId || '')
      const productSlug = String(item.productSlug || '')
      const source = productType === 'book' ? books : courses
      return !source.some((product) => String(product.id || '') === productId || String(product.slug || '') === productSlug)
    })

    const issues = [
      ...leakedCourses.map((item) => ({ type: 'leak', severity: 'critical', collection: 'courses', id: item.id, title: item.title || item.slug || item.id, message: 'منتج عام يحتوي رابطًا خاصًا.' })),
      ...leakedBooks.map((item) => ({ type: 'leak', severity: 'critical', collection: 'books', id: item.id, title: item.title || item.slug || item.id, message: 'كتاب عام يحتوي رابطًا خاصًا.' })),
      ...leakedLessons.map((item) => ({ type: 'leak', severity: 'critical', collection: 'course_lessons', id: item.id, title: item.title || item.id, message: 'درس عام يحتوي رابطًا خاصًا.' })),
      ...publishedCoursesWithoutContent.map((item) => ({ type: 'missing_content', severity: 'high', collection: 'courses', id: item.id, title: item.title || item.slug || item.id, message: 'كورس منشور بدون محتوى محمي مربوط.' })),
      ...publishedBooksWithoutContent.map((item) => ({ type: 'missing_content', severity: 'high', collection: 'books', id: item.id, title: item.title || item.slug || item.id, message: 'كتاب منشور بدون ملف محمي مربوط.' })),
      ...orphanProtected.map((item) => ({ type: 'orphan_content', severity: 'medium', collection: 'protected_content', id: item.id, title: item.title || item.id, message: 'محتوى محمي غير مربوط بمنتج موجود.' })),
    ]

    return jsonSuccess({
      summary: {
        courses: courses.length,
        books: books.length,
        lessons: lessons.length,
        protectedItems: protectedItems.length,
        issues: issues.length,
        critical: issues.filter((issue) => issue.severity === 'critical').length,
      },
      issues,
    })
  } catch (error) {
    console.error('Protected content audit API error:', error)
    return jsonError('تعذر تنفيذ فحص حماية المحتوى.', 500)
  }
}

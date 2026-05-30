import { NextRequest, NextResponse } from 'next/server'
import { cleanString, jsonError, requireAdmin } from '@/lib/server/admin-api'

const exportableCollections = new Set(['orders', 'bookings', 'users', 'leads', 'contact_messages', 'newsletter_subscribers', 'reviews'])
const csvFields: Record<string, string[]> = {
  orders: ['id', 'userId', 'userEmail', 'userName', 'productType', 'productId', 'productTitle', 'amount', 'currency', 'status', 'paymentStatus', 'paymentMethod', 'paymentReference'],
  bookings: ['id', 'userId', 'name', 'email', 'phone', 'date', 'time', 'duration', 'status', 'paymentStatus', 'paymentMethod', 'paymentReference', 'finalAmount'],
  users: ['id', 'uid', 'name', 'displayName', 'email', 'phone', 'role'],
  leads: ['id', 'name', 'email', 'phone', 'source', 'interest', 'status'],
  contact_messages: ['id', 'name', 'email', 'phone', 'subject', 'message', 'status'],
  newsletter_subscribers: ['id', 'name', 'email', 'phone', 'source', 'status'],
  reviews: ['id', 'userId', 'userName', 'productType', 'productId', 'rating', 'status', 'content'],
}

function escapeCsv(value: unknown) {
  if (value == null) return ''
  const text = typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function' ? value.toDate().toISOString() : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { collectionName: string } }) {
  try {
    const { error, context } = await requireAdmin(req, ['owner', 'admin', 'super_admin', 'finance', 'support', 'content_manager', 'viewer'])
    if (error || !context) return error

    const collectionName = cleanString(params.collectionName)
    if (!exportableCollections.has(collectionName)) return jsonError('هذا التصدير غير متاح.', 400)

    const snap = await context.db.collection(collectionName).limit(1000).get()
    const fields = csvFields[collectionName] || ['id']
    const rows = [fields.join(',')]

    snap.docs.forEach((docItem) => {
      const data = { id: docItem.id, ...docItem.data() } as Record<string, unknown>
      rows.push(fields.map((field) => escapeCsv(data[field])).join(','))
    })

    const csv = `\ufeff${rows.join('\n')}`
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="heba-${collectionName}-export.csv"`,
      },
    })
  } catch (error) {
    console.error('Admin export API error:', error)
    return jsonError('تعذر تصدير البيانات.', 500)
  }
}

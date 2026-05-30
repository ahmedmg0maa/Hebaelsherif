import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { assertAdmin, cleanText, now, serverError, writeAdminLog } from '@/lib/admin/server'

export async function GET(req: NextRequest) {
  try {
    const admin = await assertAdmin(req, 'support')
    if (!admin) return serverError('غير مصرح.', 401)
    const snap = await getAdminDb().collection('admin_tasks').orderBy('createdAt', 'desc').limit(100).get()
    return NextResponse.json({ success: true, items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) })
  } catch (error) {
    console.error('Tasks GET error:', error)
    return serverError('تعذر تحميل المهام.')
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await assertAdmin(req, 'support')
    if (!admin) return serverError('غير مصرح.', 401)
    const body = (await req.json()) as Record<string, unknown>
    const title = cleanText(body.title)
    if (!title) return serverError('عنوان المهمة مطلوب.', 400)
    const values = {
      title,
      description: cleanText(body.description),
      status: cleanText(body.status) || 'open',
      priority: cleanText(body.priority) || 'normal',
      entityType: cleanText(body.entityType),
      entityId: cleanText(body.entityId),
      assignedTo: cleanText(body.assignedTo),
      dueDate: cleanText(body.dueDate),
      createdAt: now(),
      updatedAt: now(),
      createdBy: admin.uid,
      updatedBy: admin.uid,
    }
    const ref = await getAdminDb().collection('admin_tasks').add(values)
    await writeAdminLog({ admin, action: 'admin_task_created', targetType: 'admin_task', targetId: ref.id, after: values })
    return NextResponse.json({ success: true, id: ref.id })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return serverError('تعذر حفظ المهمة.')
  }
}

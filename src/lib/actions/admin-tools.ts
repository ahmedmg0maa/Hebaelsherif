'use server'

import { revalidatePath } from 'next/cache'
import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/permissions'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'

type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string; definitive?: boolean }

const NO_ENV = 'غير متاح في بيئة العرض التجريبية.'
const NOT_ADMIN = 'هذه العملية تتطلب صلاحية إدارية.'

const hasEnv = () => hasSupabasePublicConfig() && hasSupabaseServerSecret()

export type SearchHit = {
  kind: 'customer' | 'order' | 'payment'
  title: string
  subtitle: string
  href: string
}

// Global admin search: customers by name/email, plus their recent orders/payments.
export async function adminSearch(q: string): Promise<ActionResult<SearchHit[]>> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const admin = await requirePermission('admin.search')
  if (!admin) return { ok: false, error: NOT_ADMIN }

  const term = q.trim()
  if (term.length < 2) return { ok: true, data: [] }
  if (term.length > 120 || /[(),\\\u0000-\u001f\u007f]/u.test(term)) return { ok: false, error: 'اكتبي اسمًا أو بريدًا لا يتجاوز ١٢٠ حرفًا دون رموز البحث الخاصة.' }

  const supabase = await getServerClient()
  const like = `%${term.replace(/[%_]/g, '')}%`
  const permissions=await Promise.all(['users.view','orders.view','payments.view'].map(permission=>supabase.rpc('has_permission',{permission_name:permission,uid:admin.userId})))
  if(permissions.some(result=>result.error)||permissions[0].data!==true) return {ok:false,error:NOT_ADMIN}


  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .or(`full_name.ilike.${like},email.ilike.${like}`)
    .limit(5)

  if (profilesError) return { ok: false, error: 'تعذّر البحث الآن؛ لم تُعرض النتيجة كأنها بلا نتائج.' }
  const hits: SearchHit[] = (profiles ?? []).map((p) => ({
    kind: 'customer',
    title: p.full_name || p.email,
    subtitle: p.email,
    href: `/admin/users/${p.id}`,
  }))

  const ids = (profiles ?? []).map((p) => p.id)
  if (ids.length > 0) {
    const [ordersResult, paymentsResult] = await Promise.all([
      permissions[1].data===true ? supabase
        .from('orders')
        .select('id, status, total, user_id, order_items(products(title))')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .limit(5) : Promise.resolve({data:[],error:null}),
      permissions[2].data===true ? supabase
        .from('payments')
        .select('id, status, amount, user_id')
        .in('user_id', ids)
        .eq('status', 'pending')
        .limit(5) : Promise.resolve({data:[],error:null}),
    ])
    if (ordersResult.error || paymentsResult.error) return { ok: false, error: 'تعذّر استكمال البحث في الطلبات والمدفوعات.' }
    const orders = ordersResult.data
    const payments = paymentsResult.data
    const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]))
    for (const o of orders ?? []) {
      const items = (o.order_items ?? []) as { products: { title: string } | { title: string }[] | null }[]
      const titles = items
        .map((i) => (Array.isArray(i.products) ? i.products[0]?.title : i.products?.title))
        .filter(Boolean)
        .join(' + ')
      hits.push({
        kind: 'order',
        title: titles || 'طلب شراء',
        subtitle: `${nameOf.get(o.user_id) ?? ''} · ${o.status}`,
        href: '/admin/orders',
      })
    }
    for (const p of payments ?? []) {
      hits.push({
        kind: 'payment',
        title: `دفعة بانتظار المراجعة — ${Number(p.amount).toLocaleString('ar-EG')} ج.م`,
        subtitle: nameOf.get(p.user_id) ?? '',
        href: '/admin/payments',
      })
    }
  }

  return { ok: true, data: hits.slice(0, 10) }
}

// Send a personal in-app notification to one customer (support tool).
export async function sendUserNotification(input: {
  userId: string
  title: string
  body: string
  kind: string
  link: string
  requestId: string
}): Promise<ActionResult> {
  if (!hasEnv()) return { ok: false, definitive: true, error: NO_ENV }
  const admin = await requirePermission('notifications.send')
  if (!admin) return { ok: false, definitive: true, error: NOT_ADMIN }
  const title = input.title.trim()
  const body = input.body.trim()
  const kinds = ['info', 'success', 'warning', 'error']
  const links = ['/dashboard/notifications', '/dashboard/orders', '/dashboard/payments', '/dashboard/bookings', '/dashboard/courses', '/dashboard/books', '/dashboard/workshops']
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuid.test(input.userId) || !uuid.test(input.requestId)) return { ok: false, definitive: true, error: 'تعذّر التحقق من طلب الإرسال.' }
  if (title.length < 3 || title.length > 120 || /[\u0000-\u001f\u007f]/.test(title)) return { ok: false, definitive: true, error: 'العنوان يجب أن يكون بين ٣ و١٢٠ حرفًا.' }
  if (body.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) return { ok: false, definitive: true, error: 'نص الرسالة غير صالح أو يتجاوز ١٠٠٠ حرف.' }
  if (!kinds.includes(input.kind) || !links.includes(input.link)) return { ok: false, definitive: true, error: 'نوع الإشعار أو وجهته غير معتمد.' }

  const service = getServiceClient()
  const { data, error } = await service.rpc('send_admin_notification', {
    p_actor_id: admin.userId,
    p_customer_id: input.userId,
    p_title: title,
    p_body: body,
    p_request_id: input.requestId,
    p_kind: input.kind,
    p_link: input.link,
  })
  if (error || typeof data !== 'string') return { ok: false, definitive: !!error && ['22023', '42501', 'P0002', '23505', '23503'].includes(error.code), error: 'لم يتأكد الإرسال. تحققي من نتيجة المحاولة أو أعيدي إرسال المحاولة نفسها دون تغييرها.' }
  revalidatePath(`/admin/users/${input.userId}`)
  revalidatePath('/admin/users')
  revalidatePath('/dashboard/notifications')
  return { ok: true, data: null }
}

export type NotificationHistory = { total: number; requestFound: string | null; items: { id: string; title: string; body: string; kind: string; link: string | null; read_at: string | null; created_at: string }[] }
export async function notificationHistory(userId: string, requestId: string | null = null, page = 1): Promise<ActionResult<NotificationHistory>> {
 if (!hasEnv()) return { ok: false, error: NO_ENV }
 const admin = await requirePermission('notifications.send')
 if (!admin) return { ok: false, error: NOT_ADMIN }
 const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
 if (!uuid.test(userId) || (requestId !== null && !uuid.test(requestId)) || !Number.isSafeInteger(page) || page < 1 || page > 100000) return { ok: false, error: 'مرجع الاستعلام غير صالح.' }
 const { data, error } = await getServiceClient().rpc('admin_notification_history', { p_actor_id: admin.userId, p_customer_id: userId, p_request_id: requestId, p_page: page })
 if (error || !data || !Array.isArray(data.items) || !Number.isSafeInteger(data.total)) return { ok: false, error: 'تعذّر التحقق من سجل الإشعارات.' }
 return { ok: true, data: data as NotificationHistory }
}

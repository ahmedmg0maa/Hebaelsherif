'use server'

import { createHash, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/permissions'
import { getServiceClient } from '@/lib/supabase/server'
import { deliverResendOutbox } from '@/lib/email/resend'

type Result = { ok: true; notice?: string } | { ok: false; error: string }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function customerRecordAction(
  kind: 'note' | 'tag',
  customerId: string,
  action: 'add' | 'archive' | 'restore' | 'remove',
  input: { id?: string; value?: string },
): Promise<Result> {
  const admin = await requirePermission('users.manage')
  if (!admin?.userId || !UUID.test(customerId) || (input.id && !UUID.test(input.id))) {
    return { ok: false, error: 'تعذّر التحقق من سجل العميلة.' }
  }
  const value = input.value?.trim() ?? ''
  if (kind === 'note' && action === 'add' && (value.length < 2 || value.length > 2000)) {
    return { ok: false, error: 'اكتبي ملاحظة بين حرفين و٢٠٠٠ حرف.' }
  }
  if (kind === 'tag' && action === 'add' && (value.length < 2 || value.length > 40 || /[\u0000-\u001f\u007f]/.test(value))) {
    return { ok: false, error: 'اكتبي وسمًا واضحًا لا يتجاوز ٤٠ حرفًا.' }
  }
  const rpc = kind === 'note' ? 'manage_customer_note' : 'manage_customer_tag'
  const args = kind === 'note'
    ? { p_actor_id: admin.userId, p_customer_id: customerId, p_action: action, p_note_id: input.id ?? null, p_note: action === 'add' ? value : null }
    : { p_actor_id: admin.userId, p_customer_id: customerId, p_action: action, p_tag_id: input.id ?? null, p_tag: action === 'add' ? value : null }
  const { error } = await getServiceClient().rpc(rpc, args)
  if (error) return { ok: false, error: error.code === 'PGRST202' ? 'يلزم تطبيق تحديث Customer 360 على Staging أولًا.' : 'تعذّر تحديث سجل العميلة.' }
  revalidatePath(`/admin/users/${customerId}`)
  return { ok: true }
}

export async function addCustomerNote(userId: string, note: string): Promise<Result> {
  return customerRecordAction('note', userId, 'add', { value: note })
}

export async function setCustomerNoteArchived(userId: string, noteId: string, archived: boolean): Promise<Result> {
  return customerRecordAction('note', userId, archived ? 'archive' : 'restore', { id: noteId })
}

export async function addCustomerTag(userId: string, tag: string): Promise<Result> {
  return customerRecordAction('tag', userId, 'add', { value: tag })
}

export async function removeCustomerTag(userId: string, tagId: string): Promise<Result> {
  return customerRecordAction('tag', userId, 'remove', { id: tagId })
}

export async function manageInboxMessage(
  messageId: string,
  input: { status: string; priority: string; assignedTo?: string; note?: string; spam: boolean; reply?: string },
): Promise<Result> {
  const admin = await requirePermission('inbox.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة الرسائل.' }
  if (!['new', 'read', 'replied', 'archived'].includes(input.status)
    || !['low', 'normal', 'high', 'urgent'].includes(input.priority)) {
    return { ok: false, error: 'حالة الرسالة غير صحيحة.' }
  }
  const note = input.note?.trim() ?? ''
  const reply = input.reply?.trim() ?? ''
  if (note.length > 2000 || reply.length > 10000) return { ok: false, error: 'النص أطول من الحد المسموح.' }

  const { data, error } = await getServiceClient().rpc('manage_contact_message', {
    p_message_id: messageId,
    p_actor_id: admin.userId,
    p_status: input.status,
    p_priority: input.priority,
    p_assigned_to: input.assignedTo || null,
    p_note: note || null,
    p_spam: input.spam,
    p_reply: reply || null,
  })
  if (error) return { ok: false, error: 'تعذّر حفظ متابعة الرسالة.' }
  const delivery = data && typeof data === 'object' && !Array.isArray(data) ? data as { replyDelivery?: unknown; outboxId?: unknown } : null
  let notice: string | undefined
  if (reply && delivery?.replyDelivery === 'queued' && typeof delivery.outboxId === 'string') {
    const sent = await deliverResendOutbox(delivery.outboxId, admin.userId)
    notice = sent.ok ? 'حُفظت المتابعة وأُرسل الرد.' : sent.status === 'not-due' ? 'حُفظت المتابعة؛ الإرسال قيد التنفيذ أو لم يحن موعد محاولته.' : sent.status === 'disabled' ? 'حُفظت المتابعة؛ البريد غير مهيأ ولم يُرسل الرد.' : 'حُفظت المتابعة، لكن تعذّر الإرسال وسُجلت حالة آمنة لإعادة المحاولة.'
  } else if (reply && delivery?.replyDelivery === 'disabled') notice = 'حُفظت المتابعة، وبقي الرد معطلًا لأن إرسال البريد غير مفعّل.'
  revalidatePath('/admin/inbox')
  return { ok: true, notice }
}

export async function retryOutboxEmail(outboxId: string): Promise<Result> {
  const admin = await requirePermission('inbox.manage')
  if (!admin?.userId || !/^[0-9a-f-]{36}$/i.test(outboxId)) return { ok: false, error: 'تعذّر بدء محاولة الإرسال.' }
  const delivery = await deliverResendOutbox(outboxId, admin.userId)
  revalidatePath('/admin/inbox')
  if (delivery.ok) return { ok: true, notice: 'أُرسلت الرسالة.' }
  if (delivery.status === 'disabled') return { ok: false, error: 'إرسال البريد غير مفعّل أو غير مكتمل التهيئة.' }
  if (delivery.status === 'not-due') return { ok: false, error: 'المحاولة قيد التنفيذ أو لم يحن موعد إعادة المحاولة.' }
  return { ok: false, error: 'تعذّر الإرسال؛ حُفظت الحالة الآمنة للمراجعة.' }
}

export async function createUnsubscribeLink(subscriberId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const admin = await requirePermission('newsletter.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة القائمة.' }
  const token = `${randomUUID()}${randomUUID()}`.replaceAll('-', '')
  const hash = createHash('sha256').update(token).digest('hex')
  const { error } = await getServiceClient().rpc('rotate_newsletter_unsubscribe_token', { p_subscriber_id: subscriberId, p_token_hash: hash, p_actor_id: admin.userId })
  if (error) return { ok: false, error: 'تعذّر إنشاء الرابط.' }
  return { ok: true, url: `/unsubscribe/${token}` }
}

export async function manageNewsletterSubscriber(subscriberId: string, action: 'unsubscribe' | 'erase'): Promise<Result> {
  const admin = await requirePermission('newsletter.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة القائمة.' }
  const { error } = await getServiceClient().rpc('manage_newsletter_subscriber', { p_subscriber_id: subscriberId, p_action: action, p_actor_id: admin.userId })
  if (error) return { ok: false, error: 'تعذّر تحديث سجل الاشتراك.' }
  revalidatePath('/admin/inbox')
  return { ok: true }
}

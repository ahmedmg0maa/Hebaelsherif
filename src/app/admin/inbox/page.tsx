import type { Metadata } from 'next'
import { adminList } from '@/lib/data/cms'
import { CONTACT_PURPOSE_LABELS, type ContactPurpose } from '@/lib/contact/intake'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MessageWorkspace, OutboxRetryControl, SubscriberControls } from '@/components/admin/InboxControls'

export const metadata: Metadata = { title: 'الرسائل والقائمة البريدية — الإدارة' }

type Message = {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  purpose: string
  message: string
  status: string
  priority: string
  assigned_to: string | null
  is_spam: boolean
  privacy_consent_at: string | null
  created_at: string
  contact_message_notes: { id: string; note: string; created_at: string }[]
}
type Subscriber = { id: string; email: string; status: string; consent_at: string | null; consent_version: string | null; source: string | null; created_at: string }

function purposeLabel(message: Message) {
  return CONTACT_PURPOSE_LABELS[message.purpose as ContactPurpose] ?? message.subject ?? 'استفسار عام'
}

export default async function AdminInboxPage() {
  const [messages, subscribers, roles, outbox] = await Promise.all([
    adminList<Message>(
      'contact_messages',
      'id,name,email,phone,subject,purpose,message,status,priority,assigned_to,is_spam,privacy_consent_at,created_at,contact_message_notes(id,note,created_at)',
      { orderBy: 'created_at', limit: 300 },
    ),
    adminList<Subscriber>('newsletter_subscribers', 'id,email,status,consent_at,consent_version,source,created_at', { orderBy: 'created_at', limit: 500 }),
    adminList<{ user_id: string; role: string }>('admin_roles', 'user_id,role', { limit: 100 }),
    adminList<{ id: string; to_email: string; subject: string; status: string; created_at: string; last_error: string | null; attempts: number; next_attempt_at: string | null }>(
      'email_outbox',
      'id,to_email,subject,status,created_at,last_error,attempts,next_attempt_at',
      { orderBy: 'created_at', limit: 100 },
    ),
  ])
  const admins = roles.map((role) => ({ id: role.user_id, label: role.role }))
  const date = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-bold text-antique-gold">مركز التواصل</p>
        <h1 className="text-3xl font-bold text-deep-teal">الرسائل والقائمة البريدية</h1>
        <p className="text-text-soft">تصنيف واضح، موافقة خصوصية، إسناد وملاحظات وردود محفوظة في outbox قبل أي إرسال خارجي.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-deep-teal">رسائل التواصل</h2>
        {!messages.length ? <EmptyState title="لا رسائل" description="تظهر رسائل نموذج التواصل المحكوم هنا." /> : (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card key={message.id} className={message.is_spam ? 'opacity-60' : ''}>
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-antique-gold/15 px-3 py-1 text-xs font-bold text-deep-teal">{purposeLabel(message)}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${message.privacy_consent_at ? 'bg-deep-teal/10 text-deep-teal' : 'bg-burgundy/10 text-burgundy'}`}>
                        {message.privacy_consent_at ? 'موافقة الخصوصية مسجلة' : 'رسالة قديمة قبل سجل الموافقة'}
                      </span>
                    </div>
                    <h3 className="font-bold text-deep-teal">{message.subject || purposeLabel(message)}</h3>
                    <p className="text-sm text-text-soft">{message.name} · <span dir="ltr">{message.email}</span></p>
                    <time className="text-xs text-taupe">{date.format(new Date(message.created_at))}</time>
                  </div>
                  <span className="rounded-full bg-antique-gold/15 px-3 py-1 text-xs font-bold text-deep-teal">{message.priority}</span>
                </div>
                <p className="mt-4 whitespace-pre-wrap rounded-xl bg-ivory/55 p-3 text-sm leading-loose">{message.message}</p>
                <div className="mt-4">
                  <MessageWorkspace
                    message={{
                      id: message.id,
                      status: message.status,
                      priority: message.priority,
                      assignedTo: message.assigned_to,
                      spam: message.is_spam,
                      notes: message.contact_message_notes ?? [],
                    }}
                    admins={admins}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>المشتركات</CardTitle>
          <p className="mt-2 text-xs leading-loose text-text-soft">لا يمكن للإدارة إعادة تفعيل بريد بلا موافقة؛ الاشتراك يعود فقط من النموذج العام. السجلات القديمة بلا دليل موافقة ليست مؤهلة للإرسال.</p>
          <div className="mt-4 space-y-3">
            {subscribers.map((subscriber) => (
              <div key={subscriber.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ivory/50 p-3">
                <div><p dir="ltr">{subscriber.email}</p><p className="text-xs text-taupe">{subscriber.status} · {subscriber.consent_at ? `موافقة ${subscriber.consent_version ?? 'مسجلة'} · ${subscriber.source ?? 'مصدر غير مسجل'}` : 'سجل قديم بلا موافقة مثبتة'}</p></div>
                <SubscriberControls id={subscriber.id} status={subscriber.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>صندوق البريد الصادر</CardTitle>
          <p className="mt-1 text-xs leading-relaxed text-text-soft">الحالة disabled تعني أن الرسالة محفوظة ولم تغادر المنصة. الإرسال يستخدم claim ذريًا ومفتاح idempotency ثابتًا لكل رسالة، ولا يعرض خطأ المزود الخام.</p>
          <div className="mt-4 space-y-3">
            {outbox.map((row) => (
              <div key={row.id} className="rounded-lg bg-ivory/50 p-3 text-sm">
                <div className="flex justify-between gap-3"><b>{row.subject}</b><span>{row.status}</span></div>
                <p dir="ltr" className="text-xs text-taupe">{row.to_email}</p>
                <p className="text-xs text-taupe">المحاولات: {row.attempts.toLocaleString('ar-EG')}{row.next_attempt_at ? ` · التالية ${date.format(new Date(row.next_attempt_at))}` : ''}</p>
                {row.last_error && <p className="text-xs text-burgundy">رمز آمن: {row.last_error}</p>}
                <OutboxRetryControl id={row.id} status={row.status}/>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

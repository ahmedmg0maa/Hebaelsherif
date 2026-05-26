'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { formatArabicDateTime, formatNumber } from '@/lib/utils/formatters'
import { messageStatusMeta, toMillis } from '@/lib/admin/operations'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, StatusBadge, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface MessageItem {
  id: string
  collectionName: 'contact_messages' | 'leads' | 'newsletter_subscribers'
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
  interest?: string
  source?: string
  status?: string
  adminNote?: string
  createdAt?: unknown
  updatedAt?: unknown
}

function mapMessages(snapshot: Awaited<ReturnType<typeof getDocs>>, collectionName: MessageItem['collectionName']) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, collectionName, ...(docItem.data() as Record<string, unknown>) })) as MessageItem[]
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [contactSnap, leadsSnap, newsletterSnap] = await Promise.all([
        getDocs(collection(db, 'contact_messages')),
        getDocs(collection(db, 'leads')),
        getDocs(collection(db, 'newsletter_subscribers')),
      ])
      setMessages([
        ...mapMessages(contactSnap, 'contact_messages'),
        ...mapMessages(leadsSnap, 'leads'),
        ...mapMessages(newsletterSnap, 'newsletter_subscribers'),
      ].sort((a, b) => toMillis(b.createdAt as never) - toMillis(a.createdAt as never)))
    } catch (loadError) {
      console.error('Messages load error:', loadError)
      setError('تعذر تحميل الرسائل والـ leads.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function updateMessage(item: MessageItem, status: string, action: string, extra: Record<string, unknown> = {}) {
    setSavingId(`${item.collectionName}-${item.id}`)
    setMessage('')
    setError('')
    try {
      const values = { status, ...extra, updatedAt: serverTimestamp() }
      await updateDoc(doc(db, item.collectionName, item.id), values)
      await addDoc(collection(db, 'admin_logs'), {
        action,
        targetType: item.collectionName,
        targetId: item.id,
        before: { status: item.status },
        after: values,
        message: `${action} - ${item.email || item.name || item.id}`,
        createdAt: serverTimestamp(),
      })
      setMessages((current) => current.map((messageItem) => (messageItem.id === item.id && messageItem.collectionName === item.collectionName ? { ...messageItem, status, ...extra } : messageItem)))
      setMessage('تم تحديث الرسالة.')
    } catch (updateError) {
      console.error('Message update error:', updateError)
      setError('تعذر تحديث الرسالة.')
    } finally {
      setSavingId('')
    }
  }

  function addNote(item: MessageItem) {
    const adminNote = window.prompt('اكتب ملاحظة متابعة:', item.adminNote || '')
    if (!adminNote) return
    updateMessage(item, item.status || 'read', 'message_note_added', { adminNote })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return messages.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        item.status === filter ||
        (filter === 'new' && (!item.status || item.status === 'new')) ||
        item.collectionName === filter
      const haystack = [item.name, item.email, item.phone, item.message, item.interest, item.source, item.subject].filter(Boolean).join(' ').toLowerCase()
      return matchesFilter && (!q || haystack.includes(q))
    })
  }, [filter, messages, search])

  const stats = useMemo(() => ({
    total: messages.length,
    new: messages.filter((item) => !item.status || item.status === 'new').length,
    important: messages.filter((item) => item.status === 'important').length,
    replied: messages.filter((item) => item.status === 'replied').length,
    contacts: messages.filter((item) => item.collectionName === 'contact_messages').length,
    leads: messages.filter((item) => item.collectionName === 'leads').length,
  }), [messages])

  if (loading) return <PremiumSkeleton className="h-[28rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="الرسائل وقائمة الانتظار" description="Inbox تجاري يجمع رسائل التواصل والـ leads والنشرة، مع حالات متابعة واضحة بدل رسائل مبعثرة." />
      {message ? <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="كل الرسائل" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="جديدة" value={formatNumber(stats.new)} tone="warning" />
        <MetricCard label="مهمة" value={formatNumber(stats.important)} tone="gold" />
        <MetricCard label="تم الرد" value={formatNumber(stats.replied)} tone="success" />
        <MetricCard label="تواصل" value={formatNumber(stats.contacts)} tone="petrol" />
        <MetricCard label="Leads" value={formatNumber(stats.leads)} tone="olive" />
      </div>

      <AdminPanel title="فلترة الرسائل" description="تابع الرسائل الجديدة والمهمة أولًا.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="النوع/الحالة">
            <select className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">كل الرسائل</option>
              <option value="new">جديدة</option>
              <option value="important">مهمة</option>
              <option value="read">مقروءة</option>
              <option value="replied">تم الرد</option>
              <option value="archived">الأرشيف</option>
              <option value="contact_messages">رسائل تواصل</option>
              <option value="leads">Leads</option>
              <option value="newsletter_subscribers">النشرة</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="بحث">
              <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم، بريد، هاتف، رسالة..." />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="قائمة الرسائل" description="كل رسالة لها حالة واضحة وملاحظة متابعة داخلية.">
        {filtered.length === 0 ? <EmptyState title="لا توجد رسائل" description="عند إرسال نموذج التواصل أو الاشتراك في القائمة ستظهر البيانات هنا." /> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((item) => {
              const key = `${item.collectionName}-${item.id}`
              return (
                <article key={key} className="rounded-[1.75rem] border border-sand bg-cream/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-black text-charcoal dark:text-ivory">{item.name || item.email || 'رسالة جديدة'}</h3>
                    <StatusBadge meta={messageStatusMeta[String(item.status || 'new')]} fallback={String(item.status || 'new')} />
                    <ToneBadge tone="muted">{item.collectionName === 'contact_messages' ? 'تواصل' : item.collectionName === 'leads' ? 'Lead' : 'Newsletter'}</ToneBadge>
                  </div>
                  <div className="grid gap-2 text-sm font-bold text-warm-gray dark:text-cream md:grid-cols-2">
                    <p>البريد: <span className="text-charcoal dark:text-ivory">{item.email || 'غير متوفر'}</span></p>
                    <p>الهاتف: <span className="text-charcoal dark:text-ivory">{item.phone || 'غير متوفر'}</span></p>
                    <p>المصدر: <span className="text-charcoal dark:text-ivory">{item.source || item.interest || 'غير محدد'}</span></p>
                    <p>التاريخ: <span className="text-charcoal dark:text-ivory">{formatArabicDateTime(item.createdAt as never)}</span></p>
                  </div>
                  {item.message ? <p className="mt-4 rounded-2xl border border-sand bg-ivory/80 p-4 text-sm font-bold leading-7 text-charcoal dark:border-gold/25 dark:bg-deepTeal/60 dark:text-ivory">{item.message}</p> : null}
                  {item.adminNote ? <p className="mt-3 rounded-2xl border border-gold/25 bg-gold/10 p-3 text-sm font-bold text-deepTeal dark:text-ivory">ملاحظة: {item.adminNote}</p> : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <AdminActionButton disabled={savingId === key} tone="petrol" onClick={() => updateMessage(item, 'read', 'message_read')}>مقروءة</AdminActionButton>
                    <AdminActionButton disabled={savingId === key} tone="gold" onClick={() => updateMessage(item, 'important', 'message_marked_important')}>مهمة</AdminActionButton>
                    <AdminActionButton disabled={savingId === key} tone="success" onClick={() => updateMessage(item, 'replied', 'message_replied')}>تم الرد</AdminActionButton>
                    <AdminActionButton disabled={savingId === key} tone="muted" onClick={() => updateMessage(item, 'archived', 'message_archived')}>أرشفة</AdminActionButton>
                    <AdminActionButton disabled={savingId === key} tone="muted" onClick={() => addNote(item)}>ملاحظة</AdminActionButton>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}

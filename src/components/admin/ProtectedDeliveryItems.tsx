'use client'

import Link from 'next/link'
import { useState } from 'react'
import { archiveProtectedDelivery } from '@/lib/actions/delivery-admin'
import { Button } from '@/components/ui/Button'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'

type Kind = 'book' | 'lesson-video' | 'lesson-resource' | 'workshop-resource' | 'workshop-recording'
type Item = { id: string; title: string; detail?: string; revision?: string }
export function ProtectedDeliveryItems({ kind, entityId, items, label = 'ملفات التسليم الحالية' }: { kind: Kind; entityId: string; items: Item[]; label?: string }) {
 const { busy, feedback, run } = useAdminAction()
 const [confirm, setConfirm] = useState<Item | null>(null)
 if (items.length === 0 && !feedback) return null
 return <section className="space-y-3 rounded-xl border border-line bg-surface-raised p-3" aria-label={label}>
  <p className="text-xs font-bold text-deep-teal">{label}</p>
  <ul className="space-y-2">{items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ivory/45 p-3">
   <span className="min-w-0 break-words text-xs"><span className="block font-semibold">{item.title}</span>{item.detail && <span className="text-text-soft">{item.detail}</span>}</span>
   <Button variant="burgundy" size="sm" disabled={busy} onClick={() => setConfirm(item)}>إزالة من التسليم</Button>
  </li>)}</ul>
  {confirm && <div role="group" aria-label="تأكيد إزالة الملف" className="space-y-3 rounded-xl border border-burgundy/30 p-3">
   <p className="text-sm">إزالة «{confirm.title}»؟ سيتوقف تسليمه للعميلات، ويُحفظ السجل الإداري. تنظيف التخزين يُتابع في قائمة مستقلة بعد مهلة الأمان.</p>
   <div className="flex gap-2"><Button variant="burgundy" size="sm" disabled={busy} onClick={() => run(async () => {
    const result = await archiveProtectedDelivery(kind, entityId, confirm.id, confirm.revision)
    if (result.ok) setConfirm(null)
    return result
   }, 'أُوقف تسليم الملف وسُجّلت مهمة تنظيف التخزين.')}>تأكيد الإزالة</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirm(null)}>إلغاء</Button></div>
  </div>}
  <ActionFeedback feedback={feedback} />
  <Link href="/admin/delivery" className="text-xs text-deep-teal underline underline-offset-4">متابعة نتيجة تنظيف التخزين</Link>
 </section>
}

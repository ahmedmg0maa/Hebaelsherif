'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import type { AdminControlField } from '@/lib/admin/controlData'

type ItemValue = string | number | boolean
interface ManagedItem {
  id: string
  [key: string]: unknown
}

interface AdminCollectionManagerProps {
  collectionName: string
  fields: AdminControlField[]
  titleField: string
  emptyTitle: string
  emptyDescription: string
  sortField?: string
}

function defaultValue(field: AdminControlField): ItemValue {
  if (field.defaultValue !== undefined) return field.defaultValue
  if (field.type === 'toggle') return false
  if (field.type === 'number') return 0
  return ''
}

export default function AdminCollectionManager({
  collectionName,
  fields,
  titleField,
  emptyTitle,
  emptyDescription,
  sortField = 'createdAt',
}: AdminCollectionManagerProps) {
  const [items, setItems] = useState<ManagedItem[]>([])
  const [values, setValues] = useState<Record<string, ItemValue>>({})
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const { firebaseUser } = useAuth()

  const emptyValues = useMemo(() => {
    return fields.reduce<Record<string, ItemValue>>((acc, field) => {
      acc[field.key] = defaultValue(field)
      return acc
    }, {})
  }, [fields])

  useEffect(() => {
    setValues(emptyValues)
  }, [emptyValues])

  const loadItems = useCallback(async function loadItems() {
    setLoading(true)
    try {
      if (!firebaseUser) {
        setItems([])
        return
      }

      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/collection?collectionName=${encodeURIComponent(collectionName)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await response.json()) as { items?: ManagedItem[] }

      setItems(response.ok ? payload.items || [] : [])
    } finally {
      setLoading(false)
    }
  }, [collectionName, firebaseUser])

  useEffect(() => {
    loadItems().catch((error) => {
      console.error('Admin collection load error:', error)
      setLoading(false)
    })
  }, [loadItems])

  function updateValue(key: string, value: ItemValue) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function startEdit(item: ManagedItem) {
    const nextValues = fields.reduce<Record<string, ItemValue>>((acc, field) => {
      const incoming = item[field.key]
      if (field.type === 'toggle') acc[field.key] = Boolean(incoming)
      else if (field.type === 'number') acc[field.key] = Number(incoming || 0)
      else acc[field.key] = typeof incoming === 'string' ? incoming : String(incoming || '')
      return acc
    }, {})

    setValues(nextValues)
    setEditingId(item.id)
    setMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      if (!firebaseUser) {
        setMessage('يلزم تسجيل الدخول كأدمن للحفظ.')
        return
      }

      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/collection?collectionName=${encodeURIComponent(collectionName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: editingId, values }),
      })

      if (!response.ok) {
        setMessage('تعذر الحفظ. تأكد من صلاحيات الأدمن.')
        return
      }

      setMessage(editingId ? 'تم تحديث العنصر بنجاح.' : 'تمت إضافة العنصر بنجاح.')
      setValues(emptyValues)
      setEditingId('')
      await loadItems()
    } catch (error) {
      console.error('Admin collection save error:', error)
      setMessage('تعذر الحفظ. تأكد من صلاحيات الأدمن.')
    } finally {
      setSaving(false)
    }
  }

  async function removeItem(itemId: string) {
    const confirmed = window.confirm('هل تريد أرشفة هذا العنصر؟ يمكن الاحتفاظ به في السجلات بدل الحذف النهائي.')
    if (!confirmed) return

    if (!firebaseUser) return
    const token = await firebaseUser.getIdToken()
    await fetch(`/api/admin/collection?collectionName=${encodeURIComponent(collectionName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: itemId, action: 'archive' }),
    })
    await loadItems()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={handleSubmit} className="h-fit rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
        <h3 className="text-xl font-black text-charcoal">{editingId ? 'تعديل عنصر' : 'إضافة عنصر جديد'}</h3>
        <p className="mt-2 text-sm leading-7 text-warm-gray">كل الحقول هنا قابلة للتعديل من الأدمن بدون تغيير الكود.</p>

        <div className="mt-6 grid gap-5">
          {fields.map((field) => {
            const value = values[field.key]

            return (
              <PremiumFormField key={field.key} label={field.label} hint={field.hint}>
                {field.type === 'textarea' || field.type === 'lines' ? (
                  <textarea
                    className="premium-input min-h-28 resize-y"
                    value={String(value ?? '')}
                    onChange={(event) => updateValue(field.key, event.target.value)}
                    placeholder={field.placeholder}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="premium-input"
                    value={String(value ?? '')}
                    onChange={(event) => updateValue(field.key, event.target.value)}
                  >
                    {(field.options || []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : field.type === 'toggle' ? (
                  <label className="flex items-center justify-between rounded-2xl border border-sand bg-cream/70 px-4 py-3">
                    <span className="text-sm font-bold text-charcoal">{Boolean(value) ? 'مفعل' : 'غير مفعل'}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => updateValue(field.key, event.target.checked)}
                      className="h-5 w-5 accent-burgundy"
                    />
                  </label>
                ) : (
                  <input
                    className="premium-input"
                    type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : 'text'}
                    value={String(value ?? '')}
                    onChange={(event) => updateValue(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </PremiumFormField>
            )
          })}
        </div>

        {message ? <p className="mt-5 rounded-2xl border border-sand bg-cream px-4 py-3 text-sm font-bold text-petrol">{message}</p> : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <PremiumButton type="submit" disabled={saving}>{saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة'}</PremiumButton>
          {editingId ? <PremiumButton type="button" variant="outline" onClick={() => { setEditingId(''); setValues(emptyValues) }}>إلغاء التعديل</PremiumButton> : null}
        </div>
      </form>

      <div className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
        <h3 className="text-xl font-black text-charcoal">العناصر الحالية</h3>
        <p className="mt-2 text-sm leading-7 text-warm-gray">يمكنك تعديل أو حذف أي عنصر من هنا.</p>

        {loading ? (
          <div className="mt-6 space-y-3">
            <PremiumSkeleton className="h-24" />
            <PremiumSkeleton className="h-24" />
            <PremiumSkeleton className="h-24" />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-sand bg-cream/70 p-8 text-center">
            <p className="text-lg font-black text-charcoal">{emptyTitle}</p>
            <p className="mt-2 text-sm leading-7 text-warm-gray">{emptyDescription}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-3xl border border-sand bg-cream/70 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-lg font-black text-charcoal">{String(item[titleField] || 'عنصر بدون عنوان')}</h4>
                    <p className="mt-2 line-clamp-2 text-sm leading-7 text-warm-gray">
                      {fields.slice(1, 3).map((field) => String(item[field.key] || '')).filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <PremiumButton type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>تعديل</PremiumButton>
                    <PremiumButton type="button" size="sm" variant="danger" onClick={() => removeItem(item.id)}>أرشفة</PremiumButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import type { AdminControlField, AdminControlSection } from '@/lib/admin/controlData'

type SettingValue = string | number | boolean

type Values = Record<string, SettingValue>

interface AdminSettingsConsoleProps {
  collectionName: string
  documentId: string
  sections: AdminControlSection[]
  successMessage?: string
}

function getInitialValue(field: AdminControlField): SettingValue {
  if (field.defaultValue !== undefined) return field.defaultValue
  if (field.type === 'toggle') return false
  if (field.type === 'number') return 0
  return ''
}

function normalizeIncomingValue(value: unknown, field: AdminControlField): SettingValue {
  if (field.type === 'toggle') return Boolean(value)
  if (field.type === 'number') {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : 0
  }
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value
  return getInitialValue(field)
}

export default function AdminSettingsConsole({
  collectionName,
  documentId,
  sections,
  successMessage = 'تم حفظ الإعدادات بنجاح.',
}: AdminSettingsConsoleProps) {
  const [values, setValues] = useState<Values>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { firebaseUser } = useAuth()

  const fields = useMemo(() => sections.flatMap((section) => section.fields), [sections])

  useEffect(() => {
    async function loadSettings() {
      setLoading(true)
      setError('')

      const defaults = fields.reduce<Values>((acc, field) => {
        acc[field.key] = getInitialValue(field)
        return acc
      }, {})

      try {
        if (!firebaseUser) {
          setValues(defaults)
          return
        }

        const token = await firebaseUser.getIdToken()
        const response = await fetch(
          `/api/admin/settings?collectionName=${encodeURIComponent(collectionName)}&documentId=${encodeURIComponent(documentId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        const payload = (await response.json()) as { data?: Record<string, unknown>; error?: string }
        const data = response.ok ? payload.data || {} : {}

        const nextValues = fields.reduce<Values>((acc, field) => {
          acc[field.key] = normalizeIncomingValue(data[field.key], field)
          return acc
        }, defaults)

        setValues(nextValues)

        if (!response.ok) {
          setError('تم فتح القيم الافتراضية مؤقتًا. راجع صلاحيات الأدمن أو Firebase Admin إذا لم يتم الحفظ.')
        }
      } catch (loadError) {
        console.error('Admin settings load error:', loadError)
        setValues(defaults)
        setError('تم فتح القيم الافتراضية مؤقتًا. يمكنك الحفظ بعد التأكد من اتصال Firebase Admin.')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [collectionName, documentId, fields, firebaseUser])

  function updateValue(key: string, value: SettingValue) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (!firebaseUser) {
        setError('يلزم تسجيل الدخول كأدمن لحفظ الإعدادات.')
        return
      }

      const token = await firebaseUser.getIdToken()
      const response = await fetch(
        `/api/admin/settings?collectionName=${encodeURIComponent(collectionName)}&documentId=${encodeURIComponent(documentId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ values }),
        },
      )

      if (!response.ok) {
        setError('تعذر حفظ الإعدادات. راجع صلاحيات الأدمن أو متغيرات Firebase Admin.')
        return
      }

      setMessage(successMessage)
    } catch (saveError) {
      console.error('Admin settings save error:', saveError)
      setError('تعذر حفظ الإعدادات. تأكد من صلاحيات الأدمن وحاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <PremiumSkeleton className="h-72" />
        <PremiumSkeleton className="h-72" />
        <PremiumSkeleton className="h-72" />
        <PremiumSkeleton className="h-72" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm"
        >
          <div className="mb-6">
            <h3 className="text-xl font-black text-charcoal">{section.title}</h3>
            <p className="mt-2 text-sm leading-7 text-warm-gray">{section.description}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {section.fields.map((field) => {
              const value = values[field.key]
              const wrapperClass = field.wide ? 'md:col-span-2' : ''

              return (
                <div key={field.key} className={wrapperClass}>
                  <PremiumFormField label={field.label} hint={field.hint}>
                    {field.type === 'textarea' || field.type === 'lines' ? (
                      <textarea
                        className="premium-input min-h-32 resize-y"
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
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'toggle' ? (
                      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-sand bg-cream/70 px-4 py-3">
                        <span className="text-sm font-bold text-charcoal">
                          {Boolean(value) ? 'مفعل' : 'غير مفعل'}
                        </span>
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
                        type={field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                        value={String(value ?? '')}
                        onChange={(event) =>
                          updateValue(
                            field.key,
                            field.type === 'number' ? Number(event.target.value) : event.target.value,
                          )
                        }
                        placeholder={field.placeholder}
                      />
                    )}
                  </PremiumFormField>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {message ? (
        <div className="rounded-2xl border border-olive/20 bg-olive/10 px-4 py-3 text-sm font-bold text-olive">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm font-bold text-burgundy">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-10 flex justify-end rounded-full border border-sand bg-ivory/85 p-3 shadow-premium backdrop-blur-xl">
        <PremiumButton type="submit" disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ كل الإعدادات'}
        </PremiumButton>
      </div>
    </form>
  )
}

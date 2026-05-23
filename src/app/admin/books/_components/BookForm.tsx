'use client'

import { FormEvent, useMemo, useState } from 'react'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import type { PublishStatus } from '@/types'

export interface BookFormValues {
  title: string
  slug: string
  description: string
  shortDescription: string
  emotionalPromise: string
  price: number
  status: PublishStatus
  coverImageUrl: string
  driveFileUrl?: string
  pagesCount?: number
}

interface BookFormProps {
  initialValues?: Partial<BookFormValues>
  submitLabel: string
  loading?: boolean
  onSubmit: (values: BookFormValues) => Promise<void>
}

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function BookForm({ initialValues, submitLabel, loading = false, onSubmit }: BookFormProps) {
  const [title, setTitle] = useState(initialValues?.title || '')
  const [slug, setSlug] = useState(initialValues?.slug || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [shortDescription, setShortDescription] = useState(initialValues?.shortDescription || '')
  const [emotionalPromise, setEmotionalPromise] = useState(initialValues?.emotionalPromise || '')
  const [price, setPrice] = useState(String(initialValues?.price || ''))
  const [status, setStatus] = useState<PublishStatus>(initialValues?.status || 'draft')
  const [coverImageUrl, setCoverImageUrl] = useState(initialValues?.coverImageUrl || '')
  const [driveFileUrl, setDriveFileUrl] = useState(initialValues?.driveFileUrl || '')
  const [pagesCount, setPagesCount] = useState(String(initialValues?.pagesCount || ''))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const previewSlug = useMemo(() => slug || createSlug(title), [slug, title])

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slug) setSlug(createSlug(value))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const safePrice = Number(price)
    const safePagesCount = pagesCount ? Number(pagesCount) : undefined

    if (!title.trim()) return setError('عنوان الكتاب مطلوب.')
    if (!previewSlug.trim()) return setError('رابط الكتاب slug مطلوب.')
    if (!shortDescription.trim()) return setError('الوصف القصير مطلوب.')
    if (!description.trim()) return setError('الوصف الكامل مطلوب.')
    if (!emotionalPromise.trim()) return setError('الوعد العاطفي مطلوب.')
    if (!Number.isFinite(safePrice) || safePrice < 0) return setError('السعر يجب أن يكون رقمًا صحيحًا.')
    if (safePagesCount !== undefined && (!Number.isFinite(safePagesCount) || safePagesCount < 0)) return setError('عدد الصفحات يجب أن يكون رقمًا صحيحًا.')

    setSubmitting(true)

    try {
      await onSubmit({
        title: title.trim(),
        slug: previewSlug.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        emotionalPromise: emotionalPromise.trim(),
        price: safePrice,
        status,
        coverImageUrl: coverImageUrl.trim(),
        driveFileUrl: driveFileUrl.trim(),
        pagesCount: safePagesCount,
      })
    } catch (submitError) {
      console.error('Book form submit error:', submitError)
      setError('حدث خطأ أثناء حفظ الكتاب. تأكد من البيانات وحاول مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm sm:p-8">
      <div className="mb-8">
        <p className="mini-label">Book Builder</p>
        <h2 className="mt-3 text-2xl font-black text-charcoal">بيانات الكتاب</h2>
        <p className="mt-3 text-sm leading-8 text-warm-gray">
          أضف بيانات الكتاب العامة ورابط Google Drive الداخلي. رابط فتح الكتاب النهائي يمكن ربطه من صفحة المحتوى المحمي.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PremiumFormField label="عنوان الكتاب" required>
          <input className="premium-input" value={title} onChange={(event) => handleTitleChange(event.target.value)} placeholder="مثال: رسائل إلى قلبي" />
        </PremiumFormField>
        <PremiumFormField label="رابط الكتاب slug" required hint={`الرابط النهائي: /books/${previewSlug}`}>
          <input className="premium-input" dir="ltr" value={slug} onChange={(event) => setSlug(createSlug(event.target.value))} placeholder="letters-to-my-heart" />
        </PremiumFormField>
        <PremiumFormField label="السعر بالجنيه" required>
          <input className="premium-input" type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="500" />
        </PremiumFormField>
        <PremiumFormField label="حالة النشر" required>
          <select className="premium-input" value={status} onChange={(event) => setStatus(event.target.value as PublishStatus)}>
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
          </select>
        </PremiumFormField>
        <PremiumFormField label="عدد الصفحات">
          <input className="premium-input" type="number" min={0} value={pagesCount} onChange={(event) => setPagesCount(event.target.value)} placeholder="120" />
        </PremiumFormField>
        <PremiumFormField label="رابط صورة الغلاف">
          <input className="premium-input" dir="ltr" value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} placeholder="https://..." />
        </PremiumFormField>
        <PremiumFormField label="رابط ملف Google Drive" hint="رابط داخلي للنسخة الأصلية أو ملف القراءة.">
          <input className="premium-input" dir="ltr" value={driveFileUrl} onChange={(event) => setDriveFileUrl(event.target.value)} placeholder="https://drive.google.com/..." />
        </PremiumFormField>
      </div>

      <div className="mt-5 grid gap-5">
        <PremiumFormField label="الوصف القصير" required>
          <textarea className="premium-input min-h-28 resize-y" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} placeholder="وصف مختصر وجذاب للكتاب..." />
        </PremiumFormField>
        <PremiumFormField label="الوعد العاطفي" required>
          <textarea className="premium-input min-h-28 resize-y" value={emotionalPromise} onChange={(event) => setEmotionalPromise(event.target.value)} placeholder="بعد قراءة هذا الكتاب ستشعرين..." />
        </PremiumFormField>
        <PremiumFormField label="الوصف الكامل" required>
          <textarea className="premium-input min-h-44 resize-y" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="اكتبي وصف الكتاب الكامل..." />
        </PremiumFormField>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm leading-7 text-burgundy">{error}</div> : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <PremiumButton type="submit" disabled={loading || submitting}>{submitting ? 'جاري الحفظ...' : submitLabel}</PremiumButton>
        <PremiumButton href="/admin/books" variant="outline">العودة للكتب</PremiumButton>
      </div>
    </form>
  )
}

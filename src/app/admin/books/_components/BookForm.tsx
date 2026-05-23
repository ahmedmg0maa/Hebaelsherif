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

export default function BookForm({
  initialValues,
  submitLabel,
  loading = false,
  onSubmit,
}: BookFormProps) {
  const [title, setTitle] = useState(initialValues?.title || '')
  const [slug, setSlug] = useState(initialValues?.slug || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [shortDescription, setShortDescription] = useState(initialValues?.shortDescription || '')
  const [emotionalPromise, setEmotionalPromise] = useState(initialValues?.emotionalPromise || '')
  const [price, setPrice] = useState(String(initialValues?.price || ''))
  const [status, setStatus] = useState<PublishStatus>(initialValues?.status || 'draft')
  const [coverImageUrl, setCoverImageUrl] = useState(initialValues?.coverImageUrl || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const previewSlug = useMemo(() => {
    return slug || createSlug(title)
  }, [slug, title])

  function handleTitleChange(value: string) {
    setTitle(value)

    if (!slug) {
      setSlug(createSlug(value))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const safePrice = Number(price)

    if (!title.trim()) {
      setError('عنوان الكتاب مطلوب.')
      return
    }

    if (!previewSlug.trim()) {
      setError('رابط الكتاب slug مطلوب.')
      return
    }

    if (!shortDescription.trim()) {
      setError('الوصف القصير مطلوب.')
      return
    }

    if (!description.trim()) {
      setError('الوصف الكامل مطلوب.')
      return
    }

    if (!emotionalPromise.trim()) {
      setError('الوعد العاطفي مطلوب.')
      return
    }

    if (!Number.isFinite(safePrice) || safePrice < 0) {
      setError('السعر يجب أن يكون رقمًا صحيحًا.')
      return
    }

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
      })
    } catch (submitError) {
      console.error('Book form submit error:', submitError)
      setError('حدث خطأ أثناء حفظ الكتاب. تأكد من البيانات وحاول مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-sand bg-ivory p-6 shadow-soft sm:p-8"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-black text-charcoal">بيانات الكتاب</h2>
        <p className="mt-3 text-sm leading-8 text-warm-gray">
          هذه البيانات تظهر في الصفحات العامة. لا تضع هنا رابط ملف الكتاب أو أي رابط محتوى مدفوع.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PremiumFormField label="عنوان الكتاب" required>
          <input
            className="premium-input"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="مثال: رسائل إلى قلبي"
          />
        </PremiumFormField>

        <PremiumFormField label="رابط الكتاب slug" required hint={`الرابط النهائي: /books/${previewSlug}`}>
          <input
            className="premium-input"
            dir="ltr"
            value={slug}
            onChange={(event) => setSlug(createSlug(event.target.value))}
            placeholder="letters-to-my-heart"
          />
        </PremiumFormField>

        <PremiumFormField label="السعر بالجنيه المصري" required>
          <input
            className="premium-input"
            type="number"
            min={0}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="500"
          />
        </PremiumFormField>

        <PremiumFormField label="حالة النشر" required>
          <select
            className="premium-input"
            value={status}
            onChange={(event) => setStatus(event.target.value as PublishStatus)}
          >
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
          </select>
        </PremiumFormField>

        <PremiumFormField label="رابط صورة الغلاف" hint="رابط صورة عامة مسموح ظهورها للزوار.">
          <input
            className="premium-input"
            dir="ltr"
            value={coverImageUrl}
            onChange={(event) => setCoverImageUrl(event.target.value)}
            placeholder="https://..."
          />
        </PremiumFormField>

        <div />
      </div>

      <div className="mt-5 grid gap-5">
        <PremiumFormField label="الوصف القصير" required hint="يظهر في كارت الكتاب وصفحة الكتب.">
          <textarea
            className="premium-input min-h-28 resize-y"
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
            placeholder="وصف مختصر وجذاب للكتاب..."
          />
        </PremiumFormField>

        <PremiumFormField label="الوعد العاطفي" required>
          <textarea
            className="premium-input min-h-28 resize-y"
            value={emotionalPromise}
            onChange={(event) => setEmotionalPromise(event.target.value)}
            placeholder="بعد قراءة هذا الكتاب ستشعرين..."
          />
        </PremiumFormField>

        <PremiumFormField label="الوصف الكامل" required>
          <textarea
            className="premium-input min-h-44 resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="اكتبي وصف الكتاب الكامل..."
          />
        </PremiumFormField>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm leading-7 text-burgundy">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <PremiumButton type="submit" disabled={loading || submitting}>
          {submitting ? 'جاري الحفظ...' : submitLabel}
        </PremiumButton>

        <PremiumButton href="/admin/books" variant="outline">
          العودة للكتب
        </PremiumButton>
      </div>
    </form>
  )
}
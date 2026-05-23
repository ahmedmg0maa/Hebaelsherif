'use client'

import { FormEvent, useMemo, useState } from 'react'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import type { PublishStatus } from '@/types'

export interface CourseFormValues {
  title: string
  slug: string
  description: string
  emotionalPromise: string
  outcomes: string[]
  targetAudience: string
  duration: string
  lessonsCount: number
  price: number
  status: PublishStatus
  coverImageUrl: string
}

interface CourseFormProps {
  initialValues?: Partial<CourseFormValues>
  submitLabel: string
  loading?: boolean
  onSubmit: (values: CourseFormValues) => Promise<void>
}

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function outcomesToText(outcomes?: string[]) {
  return outcomes?.join('\n') || ''
}

function textToOutcomes(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function CourseForm({
  initialValues,
  submitLabel,
  loading = false,
  onSubmit,
}: CourseFormProps) {
  const [title, setTitle] = useState(initialValues?.title || '')
  const [slug, setSlug] = useState(initialValues?.slug || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [emotionalPromise, setEmotionalPromise] = useState(initialValues?.emotionalPromise || '')
  const [outcomesText, setOutcomesText] = useState(outcomesToText(initialValues?.outcomes))
  const [targetAudience, setTargetAudience] = useState(initialValues?.targetAudience || '')
  const [duration, setDuration] = useState(initialValues?.duration || '')
  const [lessonsCount, setLessonsCount] = useState(String(initialValues?.lessonsCount || ''))
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

    const safeLessonsCount = Number(lessonsCount)
    const safePrice = Number(price)

    if (!title.trim()) {
      setError('عنوان الدورة مطلوب.')
      return
    }

    if (!previewSlug.trim()) {
      setError('رابط الدورة slug مطلوب.')
      return
    }

    if (!description.trim()) {
      setError('وصف الدورة مطلوب.')
      return
    }

    if (!emotionalPromise.trim()) {
      setError('الوعد العاطفي مطلوب.')
      return
    }

    if (!duration.trim()) {
      setError('مدة الدورة مطلوبة.')
      return
    }

    if (!Number.isFinite(safeLessonsCount) || safeLessonsCount < 0) {
      setError('عدد الدروس يجب أن يكون رقمًا صحيحًا.')
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
        emotionalPromise: emotionalPromise.trim(),
        outcomes: textToOutcomes(outcomesText),
        targetAudience: targetAudience.trim(),
        duration: duration.trim(),
        lessonsCount: safeLessonsCount,
        price: safePrice,
        status,
        coverImageUrl: coverImageUrl.trim(),
      })
    } catch (submitError) {
      console.error('Course form submit error:', submitError)
      setError('حدث خطأ أثناء حفظ الدورة. تأكد من البيانات وحاول مرة أخرى.')
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
        <h2 className="text-2xl font-black text-charcoal">بيانات الدورة</h2>
        <p className="mt-3 text-sm leading-8 text-warm-gray">
          هذه البيانات تظهر في الصفحات العامة. لا تضع هنا روابط محتوى مدفوع أو روابط Google Drive
          الخاصة بالدروس.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PremiumFormField label="عنوان الدورة" required>
          <input
            className="premium-input"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="مثال: رحلة التعافي العاطفي"
          />
        </PremiumFormField>

        <PremiumFormField label="رابط الدورة slug" required hint={`الرابط النهائي: /courses/${previewSlug}`}>
          <input
            className="premium-input"
            dir="ltr"
            value={slug}
            onChange={(event) => setSlug(createSlug(event.target.value))}
            placeholder="emotional-healing"
          />
        </PremiumFormField>

        <PremiumFormField label="مدة الدورة" required>
          <input
            className="premium-input"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="مثال: ٦ ساعات"
          />
        </PremiumFormField>

        <PremiumFormField label="عدد الدروس" required>
          <input
            className="premium-input"
            type="number"
            min={0}
            value={lessonsCount}
            onChange={(event) => setLessonsCount(event.target.value)}
            placeholder="12"
          />
        </PremiumFormField>

        <PremiumFormField label="السعر بالجنيه المصري" required>
          <input
            className="premium-input"
            type="number"
            min={0}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="1500"
          />
        </PremiumFormField>

        <PremiumFormField label="حالة النشر" required>
          <select
            className="premium-input"
            value={status}
            onChange={(event) => setStatus(event.target.value as PublishStatus)}
          >
            <option value="draft">مسودة</option>
            <option value="published">منشورة</option>
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
        <PremiumFormField label="الوعد العاطفي" required>
          <textarea
            className="premium-input min-h-28 resize-y"
            value={emotionalPromise}
            onChange={(event) => setEmotionalPromise(event.target.value)}
            placeholder="بعد هذه الدورة ستشعرين بوضوح أكبر تجاه نفسك وعلاقاتك..."
          />
        </PremiumFormField>

        <PremiumFormField label="الوصف الكامل" required>
          <textarea
            className="premium-input min-h-40 resize-y"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="اكتبي وصف الدورة الكامل..."
          />
        </PremiumFormField>

        <PremiumFormField label="النتائج المتوقعة" hint="اكتبي كل نتيجة في سطر منفصل.">
          <textarea
            className="premium-input min-h-36 resize-y"
            value={outcomesText}
            onChange={(event) => setOutcomesText(event.target.value)}
            placeholder={'فهم أوضح للمشاعر\nبناء حدود صحية\nالتعامل مع العلاقات بوعي أكبر'}
          />
        </PremiumFormField>

        <PremiumFormField label="لمن هذه الدورة؟">
          <textarea
            className="premium-input min-h-28 resize-y"
            value={targetAudience}
            onChange={(event) => setTargetAudience(event.target.value)}
            placeholder="هذه الدورة مناسبة لمن..."
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

        <PremiumButton href="/admin/courses" variant="outline">
          العودة للدورات
        </PremiumButton>
      </div>
    </form>
  )
}
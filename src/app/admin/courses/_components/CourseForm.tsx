'use client'

import { FormEvent, useMemo, useState } from 'react'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import type { PublishStatus } from '@/types'

export interface CourseLessonFormValue {
  stageTitle: string
  title: string
  description: string
  duration: number
  contentUrl?: string
  resourceUrl?: string
  order: number
}

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
  driveFolderUrl?: string
  previewVideoUrl?: string
  level?: string
  lessons: CourseLessonFormValue[]
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

function lessonsToText(lessons?: CourseLessonFormValue[]) {
  return (lessons || [])
    .sort((a, b) => a.order - b.order)
    .map((lesson) =>
      [
        lesson.stageTitle,
        lesson.title,
        lesson.description,
        lesson.duration,
        lesson.contentUrl || '',
        lesson.resourceUrl || '',
      ].join(' | '),
    )
    .join('\n')
}

function textToLessons(value: string): CourseLessonFormValue[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [stageTitle, title, description, duration, contentUrl, resourceUrl] = line
        .split('|')
        .map((item) => item.trim())

      return {
        stageTitle: stageTitle || 'الفصل الأول',
        title: title || `الدرس ${index + 1}`,
        description: description || 'وصف مختصر للدرس.',
        duration: Number(duration || 20),
        contentUrl: contentUrl || '',
        resourceUrl: resourceUrl || '',
        order: index + 1,
      }
    })
}

export default function CourseForm({ initialValues, submitLabel, loading = false, onSubmit }: CourseFormProps) {
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
  const [driveFolderUrl, setDriveFolderUrl] = useState(initialValues?.driveFolderUrl || '')
  const [previewVideoUrl, setPreviewVideoUrl] = useState(initialValues?.previewVideoUrl || '')
  const [level, setLevel] = useState(initialValues?.level || 'مناسب لكل المستويات')
  const [lessonsText, setLessonsText] = useState(lessonsToText(initialValues?.lessons))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const previewSlug = useMemo(() => slug || createSlug(title), [slug, title])
  const parsedLessons = useMemo(() => textToLessons(lessonsText), [lessonsText])

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slug) setSlug(createSlug(value))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const safeLessonsCount = Number(lessonsCount || parsedLessons.length)
    const safePrice = Number(price)

    if (!title.trim()) return setError('عنوان الكورس مطلوب.')
    if (!previewSlug.trim()) return setError('رابط الكورس slug مطلوب.')
    if (!description.trim()) return setError('وصف الكورس مطلوب.')
    if (!emotionalPromise.trim()) return setError('الوعد العاطفي مطلوب.')
    if (!duration.trim()) return setError('مدة الكورس مطلوبة.')
    if (!Number.isFinite(safeLessonsCount) || safeLessonsCount < 0) return setError('عدد الدروس يجب أن يكون رقمًا صحيحًا.')
    if (!Number.isFinite(safePrice) || safePrice < 0) return setError('السعر يجب أن يكون رقمًا صحيحًا.')

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
        lessonsCount: safeLessonsCount || parsedLessons.length,
        price: safePrice,
        status,
        coverImageUrl: coverImageUrl.trim(),
        driveFolderUrl: driveFolderUrl.trim(),
        previewVideoUrl: previewVideoUrl.trim(),
        level: level.trim(),
        lessons: parsedLessons,
      })
    } catch (submitError) {
      console.error('Course form submit error:', submitError)
      setError('حدث خطأ أثناء حفظ الكورس. تأكد من البيانات وحاول مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm sm:p-8">
      <div className="mb-8">
        <p className="mini-label">Course Builder</p>
        <h2 className="mt-3 text-2xl font-black text-charcoal">بيانات الكورس والفصول</h2>
        <p className="mt-3 text-sm leading-8 text-warm-gray">
          يمكن إضافة رابط مجلد Google Drive للكورس، وروابط الدروس داخل كل سطر. روابط المحتوى النهائية لا تظهر للزوار إلا بعد تأكيد الدفع.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <PremiumFormField label="عنوان الكورس" required>
          <input className="premium-input" value={title} onChange={(event) => handleTitleChange(event.target.value)} placeholder="مثال: رحلة إلى الذات" />
        </PremiumFormField>
        <PremiumFormField label="رابط الكورس slug" required hint={`الرابط النهائي: /courses/${previewSlug}`}>
          <input className="premium-input" dir="ltr" value={slug} onChange={(event) => setSlug(createSlug(event.target.value))} placeholder="journey-to-self" />
        </PremiumFormField>
        <PremiumFormField label="مدة الكورس" required>
          <input className="premium-input" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="مثال: ٦ أسابيع" />
        </PremiumFormField>
        <PremiumFormField label="عدد الدروس" required hint="لو تركته فارغًا يتم حسابه من الدروس المكتوبة.">
          <input className="premium-input" type="number" min={0} value={lessonsCount} onChange={(event) => setLessonsCount(event.target.value)} placeholder={String(parsedLessons.length || 12)} />
        </PremiumFormField>
        <PremiumFormField label="السعر بالجنيه" required>
          <input className="premium-input" type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="1500" />
        </PremiumFormField>
        <PremiumFormField label="حالة النشر" required>
          <select className="premium-input" value={status} onChange={(event) => setStatus(event.target.value as PublishStatus)}>
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
          </select>
        </PremiumFormField>
        <PremiumFormField label="مستوى الكورس">
          <input className="premium-input" value={level} onChange={(event) => setLevel(event.target.value)} placeholder="مناسب لكل المستويات" />
        </PremiumFormField>
        <PremiumFormField label="رابط صورة الغلاف">
          <input className="premium-input" dir="ltr" value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} placeholder="https://..." />
        </PremiumFormField>
        <PremiumFormField label="رابط فيديو تعريفي">
          <input className="premium-input" dir="ltr" value={previewVideoUrl} onChange={(event) => setPreviewVideoUrl(event.target.value)} placeholder="Google Drive / YouTube / Vimeo" />
        </PremiumFormField>
        <PremiumFormField label="مجلد Google Drive للكورس" hint="رابط المجلد الداخلي للمراجعة أو المحتوى.">
          <input className="premium-input" dir="ltr" value={driveFolderUrl} onChange={(event) => setDriveFolderUrl(event.target.value)} placeholder="https://drive.google.com/..." />
        </PremiumFormField>
      </div>

      <div className="mt-5 grid gap-5">
        <PremiumFormField label="الوعد العاطفي" required>
          <textarea className="premium-input min-h-28 resize-y" value={emotionalPromise} onChange={(event) => setEmotionalPromise(event.target.value)} placeholder="بعد هذه الكورس ستشعرين..." />
        </PremiumFormField>
        <PremiumFormField label="الوصف الكامل" required>
          <textarea className="premium-input min-h-40 resize-y" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="اكتبي وصف الكورس الكامل..." />
        </PremiumFormField>
        <PremiumFormField label="النتائج المتوقعة" hint="كل نتيجة في سطر منفصل.">
          <textarea className="premium-input min-h-32 resize-y" value={outcomesText} onChange={(event) => setOutcomesText(event.target.value)} placeholder={'فهم أعمق للذات\nحدود صحية\nتطبيقات عملية'} />
        </PremiumFormField>
        <PremiumFormField label="لمن هذه الكورس؟">
          <textarea className="premium-input min-h-24 resize-y" value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} placeholder="هذه الكورس مناسبة لمن..." />
        </PremiumFormField>
        <PremiumFormField
          label="الفصول والدروس"
          hint="كل درس في سطر: الفصل | عنوان الدرس | الوصف | المدة بالدقائق | رابط الدرس من Drive | رابط الموارد"
        >
          <textarea
            className="premium-input min-h-52 resize-y font-mono text-xs leading-7"
            dir="rtl"
            value={lessonsText}
            onChange={(event) => setLessonsText(event.target.value)}
            placeholder={'الفصل الأول: الوعي | الدرس الأول: لماذا أكرر نفس النمط؟ | فهم أولي للنمط العاطفي | 22 | https://drive.google.com/... | https://drive.google.com/...\nالفصل الأول: الوعي | الدرس الثاني: خريطة الاحتياج | تطبيق عملي لفهم الاحتياج | 18 | |'}
          />
        </PremiumFormField>
      </div>

      <div className="mt-5 rounded-2xl border border-sand bg-cream/55 p-4">
        <p className="text-xs font-black text-gold">معاينة سريعة</p>
        <p className="mt-2 text-sm text-warm-gray">عدد الدروس المقروء من الفصول: <strong className="text-charcoal">{parsedLessons.length}</strong></p>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm leading-7 text-burgundy">{error}</div> : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <PremiumButton type="submit" disabled={loading || submitting}>{submitting ? 'جاري الحفظ...' : submitLabel}</PremiumButton>
        <PremiumButton href="/admin/courses" variant="outline">العودة للكورسات</PremiumButton>
      </div>
    </form>
  )
}

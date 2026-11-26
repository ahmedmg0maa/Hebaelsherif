export const ASSESSMENT_STATUSES = ['draft', 'scheduled', 'published'] as const
export const ASSESSMENT_TARGETS = ['/booking', '/courses', '/books', '/workshops', '/articles', '/resources'] as const
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number]
export type AssessmentTarget = (typeof ASSESSMENT_TARGETS)[number]
export type AssessmentOption = { key: string; label: string; resultKey: string; weight: number }
export type AssessmentQuestion = { key: string; title: string; help: string; options: AssessmentOption[] }
export type AssessmentResult = { key: string; title: string; explanation: string; rationale: string; cta: string; target: AssessmentTarget }
export type GuidedAssessmentContent = { eyebrow: string; heading: string; lead: string; disclaimer: string; questions: AssessmentQuestion[]; results: AssessmentResult[] }
export type GuidedAssessmentInput = { assessmentId: string | null; versionId: string | null; name: string; status: AssessmentStatus; publishAt: string | null; content: GuidedAssessmentContent }
export type GuidedAssessmentValidation = { ok: true; value: GuidedAssessmentInput } | { ok: false; error: string }

const KEY = /^[a-z][a-z0-9_]{1,39}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export const defaultGuidedAssessmentContent: GuidedAssessmentContent = {
  eyebrow: 'دليل اختيار البداية',
  heading: 'ما الطريقة الأقرب لكِ؟',
  lead: 'ثلاثة أسئلة عن رغبتكِ وطريقة تعلمكِ. الترشيح يساعدكِ على المقارنة، والقرار يظل لكِ.',
  disclaimer: 'هذه نتيجة إرشادية عامة وليست تشخيصًا أو توصية علاجية أو بديلًا عن مختص مؤهل.',
  questions: [
    { key: 'current_need', title: 'بماذا تحبين أن تبدئي؟', help: '', options: [
      { key: 'need_session', label: 'مناقشة سؤال يخصني في جلسة فردية', resultKey: 'session', weight: 1 },
      { key: 'need_course', label: 'تعلم موضوع من خلال شرح وتطبيق', resultKey: 'course', weight: 1 },
      { key: 'need_book', label: 'قراءة تساعدني على التفكير في وقتي', resultKey: 'book', weight: 1 },
    ] },
    { key: 'preferred_pace', title: 'أي إيقاع يناسبك؟', help: '', options: [
      { key: 'pace_session', label: 'جلسة مركزة وشخصية', resultKey: 'session', weight: 1 },
      { key: 'pace_course', label: 'دروس مرتبة أتبعها خطوة بخطوة', resultKey: 'course', weight: 1 },
      { key: 'pace_book', label: 'وقت خاص للقراءة', resultKey: 'book', weight: 1 },
    ] },
    { key: 'next_step', title: 'ما الذي تحتاجينه أكثر؟', help: '', options: [
      { key: 'step_session', label: 'تفكيك سؤال شخصي', resultKey: 'session', weight: 1 },
      { key: 'step_course', label: 'فهم نمط متكرر وتطبيق', resultKey: 'course', weight: 1 },
      { key: 'step_book', label: 'أفكار أقرأها وأتأملها بنفسي', resultKey: 'book', weight: 1 },
    ] },
  ],
  results: [
    { key: 'session', title: 'مساحة فردية لسؤالكِ', explanation: 'تعرّفي على الخدمات ومدتها وأسعارها، ثم اختاري موعدًا متاحًا إذا وجدتِ ما يناسبكِ.', rationale: 'اخترتِ إجابات تميل إلى مساحة مركزة وشخصية.', cta: 'استكشفي الجلسات', target: '/booking' },
    { key: 'course', title: 'مسار تعلم بخطوات واضحة', explanation: 'قارني موضوعات الدورات ومناهجها وطريقة تقديمها والوقت المطلوب، قبل اختيار المسار الأقرب لكِ.', rationale: 'اخترتِ إجابات تميل إلى التعلم المتدرج والمنظم.', cta: 'استكشفي الدورات', target: '/courses' },
    { key: 'book', title: 'قراءة على إيقاعكِ', explanation: 'اقرئي وصف الكتاب ومحتواه وطريقة الوصول إليه؛ القراءة تمنحكِ مساحة تعودين إليها في الوقت الذي تختارينه.', rationale: 'اخترتِ إجابات تميل إلى القراءة الهادئة بإيقاعك.', cta: 'تصفحي الكتب', target: '/books' },
  ],
}

export function validateGuidedAssessmentContent(value: unknown): { ok: true; value: GuidedAssessmentContent } | { ok: false; error: string } {
  const source = object(value)
  const eyebrow = text(source.eyebrow), heading = text(source.heading), lead = text(source.lead), disclaimer = text(source.disclaimer)
  const questionRows = Array.isArray(source.questions) ? source.questions.map(object) : []
  const resultRows = Array.isArray(source.results) ? source.results.map(object) : []
  if (eyebrow.length < 2 || eyebrow.length > 80 || heading.length < 4 || heading.length > 140 || lead.length < 12 || lead.length > 400 || disclaimer.length < 20 || disclaimer.length > 500) return { ok: false, error: 'راجعي مقدمة الاختبار والتنبيه غير التشخيصي.' }
  if (questionRows.length < 2 || questionRows.length > 6 || resultRows.length < 2 || resultRows.length > 5) return { ok: false, error: 'يلزم من سؤالين إلى ستة، ومن نتيجتين إلى خمس نتائج.' }
  const resultKeys = new Set<string>()
  const results: AssessmentResult[] = []
  for (const row of resultRows) {
    const key = text(row.key), title = text(row.title), explanation = text(row.explanation), rationale = text(row.rationale), cta = text(row.cta), target = text(row.target)
    if (!KEY.test(key) || resultKeys.has(key) || title.length < 4 || title.length > 160 || explanation.length < 20 || explanation.length > 500 || rationale.length < 12 || rationale.length > 320 || cta.length < 2 || cta.length > 80 || !ASSESSMENT_TARGETS.includes(target as AssessmentTarget)) return { ok: false, error: 'راجعي النتائج وروابط الكتالوج المسموح بها.' }
    resultKeys.add(key); results.push({ key, title, explanation, rationale, cta, target: target as AssessmentTarget })
  }
  const questionKeys = new Set<string>(), mapped = new Set<string>(), questions: AssessmentQuestion[] = []
  for (const row of questionRows) {
    const key = text(row.key), title = text(row.title), help = text(row.help), optionRows = Array.isArray(row.options) ? row.options.map(object) : []
    if (!KEY.test(key) || questionKeys.has(key) || title.length < 4 || title.length > 180 || help.length > 240 || optionRows.length < 2 || optionRows.length > 6) return { ok: false, error: 'راجعي الأسئلة وعدد خيارات كل سؤال.' }
    questionKeys.add(key); const optionKeys = new Set<string>(), options: AssessmentOption[] = []
    for (const option of optionRows) {
      const optionKey = text(option.key), label = text(option.label), resultKey = text(option.resultKey), weight = Number(option.weight)
      if (!KEY.test(optionKey) || optionKeys.has(optionKey) || label.length < 3 || label.length > 140 || !resultKeys.has(resultKey) || !Number.isInteger(weight) || weight < 1 || weight > 3) return { ok: false, error: 'راجعي خيارات الأسئلة وربط كل خيار بنتيجة.' }
      optionKeys.add(optionKey); mapped.add(resultKey); options.push({ key: optionKey, label, resultKey, weight })
    }
    questions.push({ key, title, help, options })
  }
  if ([...resultKeys].some((key) => !mapped.has(key))) return { ok: false, error: 'كل نتيجة يجب أن تكون مرتبطة بخيار واحد على الأقل.' }
  return { ok: true, value: { eyebrow, heading, lead, disclaimer, questions, results } }
}

export function normalizeGuidedAssessmentForm(formData: FormData, now = new Date()): GuidedAssessmentValidation {
  const assessmentId = text(formData.get('assessment_id')), versionId = text(formData.get('version_id'))
  if ([assessmentId, versionId].some((value) => value && !UUID.test(value))) return { ok: false, error: 'مرجع الاختبار أو الإصدار غير صالح.' }
  const name = text(formData.get('name')), status = text(formData.get('status')), publishRaw = text(formData.get('publish_at'))
  if (name.length < 3 || name.length > 120 || !ASSESSMENT_STATUSES.includes(status as AssessmentStatus)) return { ok: false, error: 'راجعي اسم الاختبار وحالة الإصدار.' }
  const publishAt = publishRaw ? parseCairoLocalDateTime(publishRaw) : null
  if (status === 'scheduled' && (!publishAt || Number.isNaN(publishAt.valueOf()) || publishAt <= now)) return { ok: false, error: 'اختاري موعد نشر مستقبليًا.' }
  let raw: unknown
  try { raw = JSON.parse(text(formData.get('content_json'))) } catch { return { ok: false, error: 'تعذّر قراءة حقول الاختبار المنظمة.' } }
  const content = validateGuidedAssessmentContent(raw)
  if (!content.ok) return content
  return { ok: true, value: { assessmentId: assessmentId || null, versionId: versionId || null, name, status: status as AssessmentStatus, publishAt: publishAt?.toISOString() ?? null, content: content.value } }
}
import { parseCairoLocalDateTime } from '../booking/cairo-time.ts'

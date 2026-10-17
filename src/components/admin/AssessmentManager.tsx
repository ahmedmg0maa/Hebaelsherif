'use client'
import {AdminTextarea} from './AdminField'

import {AdminField,AdminSelect} from './AdminField'

import { useState } from 'react'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'
import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StartHereQuiz } from '@/components/catalog/StartHereQuiz'
import { deleteGuidedAssessmentDraft, saveGuidedAssessmentVersion } from '@/lib/actions/assessments'
import { ASSESSMENT_STATUSES, ASSESSMENT_TARGETS, defaultGuidedAssessmentContent, validateGuidedAssessmentContent, type AssessmentStatus, type GuidedAssessmentContent } from '@/lib/assessments/governance'

export type AdminAssessmentVersionRow = { id: string; assessment_id: string; version: number; status: AssessmentStatus | 'archived'; publish_at: string | null; published_at: string | null; content: unknown; updated_at: string; guided_assessments: { name: string; published_version_id: string | null } | { name: string; published_version_id: string | null }[] | null }
const statusLabels: Record<AssessmentStatus | 'archived', string> = { draft: 'مسودة', scheduled: 'مجدول', published: 'منشور', archived: 'مؤرشف' }
const targetLabels: Record<string, string> = { '/booking': 'الجلسات المنشورة', '/courses': 'الدورات المنشورة', '/books': 'الكتب المنشورة', '/workshops': 'الورش المنشورة', '/articles': 'المقالات المنشورة', '/resources': 'الموارد المنشورة' }
const key = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
const relation = (row: AdminAssessmentVersionRow) => Array.isArray(row.guided_assessments) ? row.guided_assessments[0] : row.guided_assessments
const normalized = (value: unknown) => { const result = validateGuidedAssessmentContent(value); return result.ok ? result.value : defaultGuidedAssessmentContent }

function AssessmentEditor({ assessmentId, versionId, version, name, initial, initialStatus = 'draft', initialPublishAt = null, allowDelete }: { assessmentId: string | null; versionId: string | null; version?: number; name: string; initial: GuidedAssessmentContent; initialStatus?: AssessmentStatus; initialPublishAt?: string | null; allowDelete?: boolean }) {
  const [content, setContent] = useState<GuidedAssessmentContent>(initial)
  const {busy,feedback,run}=useAdminAction()
  const [confirmDelete,setConfirmDelete]=useState(false)
  const updateQuestion = (index: number, value: GuidedAssessmentContent['questions'][number]) => setContent((current) => ({ ...current, questions: current.questions.map((row, i) => i === index ? value : row) }))
  const updateResult = (index: number, value: GuidedAssessmentContent['results'][number]) => setContent((current) => ({ ...current, results: current.results.map((row, i) => i === index ? value : row) }))
  const removeResult = (index: number) => setContent((current) => {
    if (current.results.length <= 2) return current
    const removed = current.results[index], results = current.results.filter((_, i) => i !== index), fallback = results[0].key
    return { ...current, results, questions: current.questions.map((question) => ({ ...question, options: question.options.map((option) => option.resultKey === removed.key ? { ...option, resultKey: fallback } : option) })) }
  })
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const formData = new FormData(event.currentTarget)
    formData.set('content_json', JSON.stringify(content)); if (assessmentId) formData.set('assessment_id', assessmentId); if (versionId) formData.set('version_id', versionId)
    await run(()=>saveGuidedAssessmentVersion(formData),'حُفظ الإصدار.')
  }
  return <form className="space-y-5" aria-busy={busy} onSubmit={submit}><fieldset disabled={busy} className="min-w-0 space-y-5">
    <div className="grid gap-3 md:grid-cols-2">
      <AdminField label="اسم الاختبار" name="name" defaultValue={name} minLength={3} maxLength={120} required />
      <AdminSelect label="حالة الإصدار" name="status" defaultValue={initialStatus}>{ASSESSMENT_STATUSES.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</AdminSelect>
      <AdminField label="موعد النشر عند اختيار «مجدول»" name="publish_at" type="datetime-local" defaultValue={initialPublishAt?formatCairoLocalDateTime(initialPublishAt)??'':''} />
      <p className="self-end rounded-xl bg-ivory/70 p-3 text-xs leading-relaxed text-text-soft">{versionId ? `تعديل الإصدار ${version?.toLocaleString('ar-EG')}` : assessmentId ? 'سيُنشأ إصدار جديد مستقل؛ النسخة المنشورة لن تتغير حتى النشر.' : 'سيُنشأ الاختبار وإصداره الأول.'}</p>
    </div>
    <fieldset className="grid gap-3 rounded-2xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">مقدمة وتنبيه</legend>
      <AdminField  label={`السطر التعريفي`} value={content.eyebrow} onChange={(e) => setContent({ ...content, eyebrow: e.target.value })} name="assessment_eyebrow" required minLength={2} maxLength={80} hint="سطر تعريفي يظهر فوق عنوان الاختبار الإرشادي." example="خطوة لفهم احتياجاتك"/>
      <AdminField  label={`العنوان`} required minLength={4} maxLength={140} hint="عنوان الاختبار كما تراه الزائرة." example="ما المسار المناسب لكِ الآن؟" value={content.heading} onChange={(e) => setContent({ ...content, heading: e.target.value })} name="title"/>
      <AdminTextarea  label={`الشرح`} value={content.lead} onChange={(e) => setContent({ ...content, lead: e.target.value })} rows={3} name="assessment_lead" required minLength={12} maxLength={400} hint="اشرحي كيف تستخدم الزائرة الأسئلة وما الذي ستحصل عليه منها." example="أجيبي عن الأسئلة لاختيار مسار تعلّم يناسبك" className="grid gap-1 text-xs font-bold text-deep-teal md:col-span-2"/>
      <AdminTextarea  label={`التنبيه غير التشخيصي`} value={content.disclaimer} onChange={(e) => setContent({ ...content, disclaimer: e.target.value })} rows={3} name="assessment_disclaimer" required minLength={20} maxLength={500} hint="تنبيه ظاهر يوضح أن النتيجة إرشادية وليست تشخيصًا أو بديلًا لمختص." example="هذا الاختبار للتوجيه والتأمل ولا يقدم تشخيصًا طبيًا" className="grid gap-1 text-xs font-bold text-burgundy md:col-span-2"/>
    </fieldset>
    <fieldset className="space-y-4 rounded-2xl border border-line p-4"><legend className="px-2 font-bold text-deep-teal">النتائج والوجهات المنشورة</legend>
      {content.results.map((result, index) => <div key={result.key} className="grid gap-3 rounded-xl bg-ivory/60 p-3 md:grid-cols-2">
        <div className="flex items-center justify-between gap-2 md:col-span-2"><strong className="text-sm text-deep-teal">النتيجة {index + 1}</strong><button type="button" disabled={content.results.length <= 2} onClick={() => removeResult(index)} className="text-xs font-bold text-burgundy disabled:opacity-40">حذف النتيجة</button></div>
        <AdminField  label={`العنوان`} required minLength={4} maxLength={160} hint="اسم النتيجة التي تظهر عند تطابق اختيارات الزائرة معها." example="ابدئي بمسار التعلم الذاتي" value={result.title} onChange={(e) => updateResult(index, { ...result, title: e.target.value })} name="title"/>
        <AdminField  label={`نص الزر`} value={result.cta} onChange={(e) => updateResult(index, { ...result, cta: e.target.value })} name={`result_cta_${index}`} required minLength={2} maxLength={80} hint="زر الانتقال من النتيجة إلى المسار المنشور." example="استكشفي المسار"/>
        <AdminTextarea  label={`التفسير`} value={result.explanation} onChange={(e) => updateResult(index, { ...result, explanation: e.target.value })} rows={3} name={`result_explanation_${index}`} required minLength={20} maxLength={500} hint="تفسير محايد للنتيجة تقرؤه الزائرة؛ تجنبي التشخيص والوعود." example="قد يناسبك التعلّم بخطوات قصيرة وتجربة التطبيقات على مهلك" className="grid gap-1 text-xs font-bold text-deep-teal md:col-span-2"/>
        <AdminField  label={`سبب ظهور النتيجة`} value={result.rationale} onChange={(e) => updateResult(index, { ...result, rationale: e.target.value })} name={`result_rationale_${index}`} required minLength={12} maxLength={320} hint="سبب ظهور النتيجة للزائرة، مرتبط بإجاباتها. هذا النص ظاهر لها." example="لأنك تفضلين القراءة والتطبيق في وقتك الخاص"/>
        <AdminSelect  label={`وجهة كتالوج آمنة`} value={result.target} onChange={(e) => updateResult(index, { ...result, target: e.target.value as typeof result.target })} name={`result_target_${index}`} required hint="وجهة موجودة ضمن الكتالوج؛ لا يُسمح بروابط خارجية في نتائج الاختبار." example="الموارد المجانية لمسار الاستكشاف">{ASSESSMENT_TARGETS.map((target) => <option key={target} value={target}>{targetLabels[target]}</option>)}</AdminSelect>
      </div>)}
      <Button type="button" size="sm" variant="secondary" disabled={content.results.length >= 5} onClick={() => setContent((current) => ({ ...current, results: [...current.results, { key: key('result'), title: 'نتيجة جديدة', explanation: 'اكتبي تفسيرًا واضحًا ومحايدًا لهذه النتيجة الإرشادية.', rationale: 'اشرحي باختصار سبب ظهور هذه النتيجة.', cta: 'استكشفي المسار', target: '/resources' }] }))}>إضافة نتيجة</Button>
    </fieldset>
    <fieldset className="space-y-4 rounded-2xl border border-line p-4"><legend className="px-2 font-bold text-deep-teal">الأسئلة والخيارات وربط النتائج</legend>
      {content.questions.map((question, questionIndex) => <div key={question.key} className="space-y-3 rounded-xl bg-ivory/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-deep-teal">السؤال {questionIndex + 1}</strong><button type="button" disabled={content.questions.length <= 2} onClick={() => setContent((current) => ({ ...current, questions: current.questions.filter((_, i) => i !== questionIndex) }))} className="text-xs font-bold text-burgundy disabled:opacity-40">حذف السؤال</button></div>
        <div className="grid gap-3 md:grid-cols-2"><AdminField  label={`نص السؤال`} required minLength={4} maxLength={180} hint="سؤال واضح دون أحكام أو تشخيص، وله خياران إلى ستة خيارات." example="كيف تفضلين أن تبدئي التعلّم؟" value={question.title} onChange={(e) => updateQuestion(questionIndex, { ...question, title: e.target.value })} name="question"/><AdminField  label={`شرح اختياري`} value={question.help} onChange={(e) => updateQuestion(questionIndex, { ...question, help: e.target.value })} name="admin_field_64"/></div>
        {question.options.map((option, optionIndex) => <div key={option.key} className="grid gap-2 border-t border-line pt-3 md:grid-cols-[1fr_1fr_6rem_auto]">
          <AdminField  label={`الخيار`} value={option.label} onChange={(e) => updateQuestion(questionIndex, { ...question, options: question.options.map((row, i) => i === optionIndex ? { ...row, label: e.target.value } : row) })} name={`option_label_${questionIndex}_${optionIndex}`} required minLength={3} maxLength={140} hint="إجابة واحدة يمكن للزائرة اختيارها لهذا السؤال." example="أفضل أن أبدأ بالقراءة"/>
          <AdminSelect  label={`يرتبط بنتيجة`} value={option.resultKey} onChange={(e) => updateQuestion(questionIndex, { ...question, options: question.options.map((row, i) => i === optionIndex ? { ...row, resultKey: e.target.value } : row) })} name={`option_result_${questionIndex}_${optionIndex}`} required hint="النتيجة التي تزداد درجتها عند اختيار هذه الإجابة." example="اربطي إجابة القراءة بنتيجة مسار القراءة">{content.results.map((result) => <option key={result.key} value={result.key}>{result.title}</option>)}</AdminSelect>
          <AdminSelect  label={`الوزن`} value={option.weight} onChange={(e) => updateQuestion(questionIndex, { ...question, options: question.options.map((row, i) => i === optionIndex ? { ...row, weight: Number(e.target.value) } : row) })} name={`option_weight_${questionIndex}_${optionIndex}`} required hint="مقدار تأثير الإجابة على نتيجتها: 1 تأثير عادي، 2 متوسط، 3 أقوى." example="1 عندما تتساوى أهمية الخيارات">{[1, 2, 3].map((weight) => <option key={weight} value={weight}>{weight}</option>)}</AdminSelect>
          <button type="button" disabled={question.options.length <= 2} onClick={() => updateQuestion(questionIndex, { ...question, options: question.options.filter((_, i) => i !== optionIndex) })} className="self-end px-2 py-3 text-xs font-bold text-burgundy disabled:opacity-40">حذف</button>
        </div>)}
        <Button type="button" size="sm" variant="ghost" disabled={question.options.length >= 6} onClick={() => updateQuestion(questionIndex, { ...question, options: [...question.options, { key: key('option'), label: 'خيار جديد', resultKey: content.results[0].key, weight: 1 }] })}>إضافة خيار</Button>
      </div>)}
      <Button type="button" size="sm" variant="secondary" disabled={content.questions.length >= 6} onClick={() => setContent((current) => ({ ...current, questions: [...current.questions, { key: key('question'), title: 'سؤال جديد', help: '', options: [{ key: key('option'), label: 'الخيار الأول', resultKey: current.results[0].key, weight: 1 }, { key: key('option'), label: 'الخيار الثاني', resultKey: current.results[1].key, weight: 1 }] }] }))}>إضافة سؤال</Button>
    </fieldset>
    </fieldset><ActionFeedback feedback={feedback}/><div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={busy}>{busy?'جارٍ الحفظ…':versionId?'حفظ الإصدار':'إنشاء الإصدار'}</Button>{allowDelete&&versionId&&(!confirmDelete?<Button type="button" variant="burgundy" disabled={busy} onClick={()=>setConfirmDelete(true)}>حذف المسودة</Button>:<div className="rounded-xl border border-burgundy/30 p-4"><p className="mb-3 text-sm text-burgundy">حذف هذه المسودة نهائي. الإصدار المنشور يبقى محفوظًا.</p><div className="flex gap-3"><Button type="button" variant="burgundy" disabled={busy} onClick={async()=>{if(await run(()=>deleteGuidedAssessmentDraft(versionId),'حُذفت المسودة.'))setConfirmDelete(false)}}>تأكيد الحذف</Button><Button type="button" variant="ghost" disabled={busy} onClick={()=>setConfirmDelete(false)}>تراجع</Button></div></div>)}</div>
  </form>
}

export function AssessmentManager({ rows }: { rows: AdminAssessmentVersionRow[] }) {
  const ordered = [...rows].sort((a, b) => b.version - a.version), latest = ordered[0]
  if (!latest) return <div className="rounded-2xl border border-line bg-surface-raised p-5"><h2 className="mb-4 text-xl font-bold text-deep-teal">إنشاء أول إصدار</h2><AssessmentEditor assessmentId={null} versionId={null} name="اختبار ابدئي من هنا" initial={defaultGuidedAssessmentContent} /></div>
  const parent = relation(latest), editable = latest.status === 'draft' || latest.status === 'scheduled' ? latest : null
  const publishedId = parent?.published_version_id, preview = ordered.find((row) => row.id === publishedId) ?? latest
  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-surface-raised p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-deep-teal">{editable ? `تحرير الإصدار ${editable.version.toLocaleString('ar-EG')}` : 'إنشاء إصدار جديد من النسخة الحالية'}</h2><p className="mt-1 text-sm text-text-soft">الإصدارات المنشورة ثابتة، والنشر أو الجدولة يبدّل المؤشر العام ذريًا.</p></div>{publishedId ? <Badge tone="success">يوجد إصدار عام منشور</Badge> : <Badge tone="sand">لا يوجد إصدار رسمي منشور</Badge>}</div><AssessmentEditor key={`${editable?.id??latest.id}:${editable?'edit':'new'}`} assessmentId={latest.assessment_id} versionId={editable?.id ?? null} version={editable?.version} name={parent?.name ?? 'اختبار ابدئي من هنا'} initial={normalized((editable ?? latest).content)} initialStatus={editable?.status as AssessmentStatus | undefined} initialPublishAt={editable?.publish_at} allowDelete={Boolean(editable)} /></section>
    <section className="rounded-2xl border border-line bg-surface-raised p-5"><h2 className="text-xl font-bold text-deep-teal">سجل الإصدارات</h2><div className="mt-4 flex flex-wrap gap-2">{ordered.map((row) => <Badge key={row.id} tone={row.id === publishedId ? 'success' : row.status === 'scheduled' ? 'pending' : 'sand'}>إصدار {row.version.toLocaleString('ar-EG')} · {statusLabels[row.status]}</Badge>)}</div></section>
    <details className="rounded-2xl border border-dashed border-antique-gold/60 bg-surface-raised p-5"><summary className="cursor-pointer font-bold text-deep-teal">معاينة الإصدار {preview.version.toLocaleString('ar-EG')} داخل مكوّن الصفحة الفعلي</summary><div className="mt-5"><StartHereQuiz content={normalized(preview.content)} version={preview.version} /></div></details>
  </div>
}

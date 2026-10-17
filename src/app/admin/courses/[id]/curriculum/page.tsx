import {adminRelatedRows} from '@/lib/data/admin-pagination'
import {LessonContentEditor} from '@/components/admin/LessonContentEditor'
import type { Metadata } from 'next'
import { sha256 } from '@/lib/delivery/security'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ModuleForm, LessonForm } from '@/components/admin/CurriculumForms'
import { StreamVideoUpload } from '@/components/admin/StreamVideoUpload'
import { isFreeOperation } from '@/lib/operations/cost-mode'
import { ProtectedDeliveryUpload } from '@/components/admin/ProtectedDeliveryUpload'
import { LessonEditor, ModuleEditor } from '@/components/admin/CurriculumItemEditors'
import { ProtectedDeliveryItems } from '@/components/admin/ProtectedDeliveryItems'

export const metadata: Metadata = { title: 'منشئ المنهج — الإدارة' }

type Props = { params: Promise<{ id: string }> }

const hasEnv = hasSupabasePublicConfig

export default async function CurriculumBuilderPage({ params }: Props) {
  const { id } = await params

  if (!hasEnv()) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <EmptyState
          title="منشئ المنهج يتطلب قاعدة البيانات"
          description="اربطي مشروع Supabase وستتمكنين من بناء الوحدات والدروس من هنا."
          actionLabel="عودة للدورات"
          actionHref="/admin/courses"
        />
      </div>
    )
  }

  const supabase = await getServerClient()
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id,title')
    .eq('id', id)
    .maybeSingle()
  if (courseError) throw new Error('admin_curriculum_course_read_failed')
  if (!course) notFound()
  const modules=await adminRelatedRows<{id:string;title:string;sort:number}>('course_modules','id,title,sort','course_id',[id],'sort')
  const moduleIds=modules.map(module=>module.id)
  type Lesson={id:string;module_id:string;title:string;description:string;duration_seconds:number;sort:number;is_preview:boolean;video_path:string|null;lesson_resources:{id:string;title:string;kind:string;archived_at:string|null}[]}
  const lessonsResult={data:await adminRelatedRows<Lesson>('course_lessons','id,module_id,title,description,duration_seconds,sort,is_preview,video_path,lesson_resources(id,title,kind,archived_at)','module_id',moduleIds,'sort')}
  const lessonsByModule = new Map<string, typeof lessonsResult.data>()
  for (const lesson of lessonsResult.data ?? []) lessonsByModule.set(lesson.module_id, [...(lessonsByModule.get(lesson.module_id) ?? []), lesson])

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <Link href="/admin/courses" className="text-sm font-semibold text-antique-gold hover:text-burgundy">
          الدورات
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-deep-teal">منهج: {course.title}</h1>
        <p className="mt-1 text-text-soft">أضيفي الوحدات ثم الدروس داخل كل وحدة — الترتيب تلقائي بالإضافة.</p>
      </header>

      <Card className="p-6">
        <ModuleForm courseId={course.id} />
      </Card>
      {isFreeOperation() && <Card className="space-y-2 border-antique-gold/30"><CardTitle>تجهيز الدروس للرفع المجاني</CardTitle><p className="text-sm leading-8 text-text-soft">قسّمي التسجيل الطويل إلى دروس قصيرة، واضغطي كل مقطع إلى أقل من 50 ميجابايت قبل الرفع. يمكنك إضافة أوراق العمل بجوار الدرس. راقبي سعة التخزين والنقل من حالة النظام؛ تقسيم الفيديو لا يزيد إجمالي السعة المجانية.</p><Link href="/admin/system" className="inline-flex min-h-11 items-center text-sm text-burgundy underline">متابعة التشغيل والسعة</Link></Card>}

      {modules.length === 0 ? (
        <EmptyState title="لا وحدات بعد" description="ابدئي بإضافة الوحدة الأولى من النموذج أعلاه." />
      ) : (
        <div className="space-y-6">
          {modules.map((m) => (
            <Card key={m.id} className="space-y-4">
              <CardTitle>{m.title}</CardTitle>
              <ModuleEditor id={m.id} courseId={course.id} title={m.title} sort={m.sort}/>
              {(lessonsByModule.get(m.id) ?? []).length > 0 && (
                <ul className="divide-y divide-line/70 rounded-xl border border-line">
                  {(lessonsByModule.get(m.id) ?? [])
                    .map((l) => (
                      <li key={l.id} className="space-y-3 px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-ink">
                          {l.title}
                          {l.is_preview && <Badge tone="cobalt">معاينة</Badge>}
                          {!l.video_path && <Badge tone="pending">بلا فيديو</Badge>}
                        </span>
                        <span className="tnum text-taupe">
                          {Math.round(l.duration_seconds / 60).toLocaleString('ar-EG')} د
                        </span>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2"><div className="space-y-3"><ProtectedDeliveryUpload kind="lesson-video" entityId={l.id} label="فيديو الدرس حتى 50MB" />{!isFreeOperation() && <StreamVideoUpload lessonId={l.id} />}</div><ProtectedDeliveryUpload kind="lesson-resource" entityId={l.id} label="إضافة مورد للدرس" /></div>
                        <div className="grid gap-2 md:grid-cols-2">
                          <ProtectedDeliveryItems
                            kind="lesson-video"
                            entityId={l.id}
                            label="فيديو الدرس الحالي"
                            items={l.video_path ? [{ id: l.id, revision: sha256(l.video_path), title: 'فيديو الدرس المحمي' }] : []}
                          />
                          <ProtectedDeliveryItems
                            kind="lesson-resource"
                            entityId={l.id}
                            label="موارد الدرس الحالية"
                            items={(l.lesson_resources ?? []).filter((item) => !item.archived_at).map((item) => ({ id: item.id, title: item.title, detail: item.kind }))}
                          />
                        </div>
                        <LessonContentEditor id={l.id} courseId={course.id} description={l.description??''} hasVideo={Boolean(l.video_path)}/>
                        <LessonEditor id={l.id} courseId={course.id} title={l.title} minutes={Math.round(l.duration_seconds/60)} sort={l.sort} preview={l.is_preview}/>
                      </li>
                    ))}
                </ul>
              )}
              <LessonForm moduleId={m.id} courseId={course.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

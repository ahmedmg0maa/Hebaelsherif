import { OperationControl } from '@/components/admin/OperationControls'
import { OPERATION_CONTROLS, isOperationControl } from '@/lib/admin/operation-controls'
import type { Metadata } from 'next'
import { adminList } from '@/lib/data/cms'
import { Card, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SettingEditor, FlagToggle } from '@/components/admin/AdminControls'
import { Button } from '@/components/ui/Button'
import { normalizeOwnerProfile } from '@/lib/owner/profile'
import { OwnerProfileEditor } from '@/components/admin/OwnerProfileEditor'
import { OperationalSettingsForm, type OperationalSettings } from '@/components/admin/OperationalSettingsForm'
import { StartHereExperienceEditor } from '@/components/admin/StartHereExperienceEditor'
import { defaultStartHereContent, normalizeStartHereContent } from '@/lib/start-here/content'

export const metadata: Metadata = { title: 'الإعدادات — الإدارة' }

type SettingRow = { key: string; value: unknown; is_public: boolean }
type FlagRow = { key: string; is_enabled: boolean; description: string }

export default async function AdminSettingsPage() {
  const [settings, flags] = await Promise.all([
    adminList<SettingRow>('site_settings', 'key, value, is_public', { orderBy: 'key', ascending: true }),
    adminList<FlagRow>('feature_flags', 'key, is_enabled, description', { orderBy: 'key', ascending: true }),
  ])
  const ownerProfile = normalizeOwnerProfile(settings.find(setting => setting.key === 'owner_profile')?.value)
  const startHereRow = settings.find((setting) => setting.key === 'start_here_experience')
  const startHereContent = startHereRow ? normalizeStartHereContent(startHereRow.value) : defaultStartHereContent
  const valueOf = (key: string) => settings.find((setting) => setting.key === key)?.value as Record<string, unknown> | undefined
  const operational: OperationalSettings = {
    expiryHours: Number(valueOf('order_expiry_hours')?.hours ?? 72),
    booking: {
      slotInterval: Number(valueOf('booking_policy')?.slot_interval_minutes ?? 30),
      bufferBefore: Number(valueOf('booking_policy')?.buffer_before_minutes ?? 0),
      bufferAfter: Number(valueOf('booking_policy')?.buffer_after_minutes ?? 0),
      minimumNotice: Number(valueOf('booking_policy')?.minimum_notice_minutes ?? 30),
      horizonDays: Number(valueOf('booking_policy')?.booking_horizon_days ?? 30),
      maxPerDay: Number(valueOf('booking_policy')?.max_bookings_per_day ?? 20),
      cancelNoticeHours: Number(valueOf('booking_policy')?.customer_cancel_notice_hours ?? 24),
    },
    instapay: valueOf('payment_instapay') ? { handle: String(valueOf('payment_instapay')?.handle ?? ''), name: String(valueOf('payment_instapay')?.name ?? '') } : null,
    wallet: valueOf('payment_wallet') ? { number: String(valueOf('payment_wallet')?.number ?? ''), provider: String(valueOf('payment_wallet')?.provider ?? '') } : null,
    bank: valueOf('payment_bank') ? { bank: String(valueOf('payment_bank')?.bank ?? ''), iban: String(valueOf('payment_bank')?.iban ?? ''), name: String(valueOf('payment_bank')?.name ?? '') } : null,
    emailEnabled: valueOf('email_delivery')?.enabled === true && valueOf('email_delivery')?.provider === 'resend',
  }
  const typedKeys = new Set(['home_copy','owner_profile','start_here_experience', 'order_expiry_hours', 'booking_policy', 'payment_instapay', 'payment_wallet', 'payment_bank', 'email_delivery'])

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">الإعدادات</h1>
        <p className="mt-1 text-text-soft">
          بيانات الدفع ومهلة الطلبات والروابط — تُستخدم مباشرة في صفحة الدفع والواجهة العامة.
        </p>
      </header>

      <section id="operation-control" className="space-y-5 scroll-mt-8">
        <h2 className="font-heading text-2xl font-bold text-deep-teal">فتح الموقع وإغلاقه</h2>
        <p className="text-sm leading-loose text-text-soft">الإدارة الرئيسية (المالكة) تملك جميع صلاحيات الموقع. يمكن تفويض الفريق من شاشة الأدوار. الإغلاق يوقف استقبال المعاملات المحددة، ولا يحذف سجلات العميلات أو مستحقاتهن.</p>
        <div className="grid gap-4 sm:grid-cols-2">{Object.entries(OPERATION_CONTROLS).map(([key, control]) => {
          const flag = flags.find(row => row.key === key)
          return flag && isOperationControl(key) ? <OperationControl key={key} flagKey={key} enabled={flag.is_enabled} /> : <div key={key} className="rounded-xl border border-line p-5"><h3 className="font-bold text-deep-teal">{control.title}</h3><p className="mt-3 text-sm text-text-soft">لم تُهيّأ أداة التحكم هذه في البيئة بعد.</p></div>
        })}</div>
      </section>
      <Card className="space-y-5 p-8">
        <CardTitle>إدارة الموقع بالكامل</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">{[
          ['/admin/pages', 'الصفحات والرئيسية والقوائم'], ['/admin/products', 'المنتجات والحزم ومتغيرات الأسعار'],
          ['/admin/courses', 'الدورات والمحتوى التعليمي'], ['/admin/books', 'الكتب وملفات التسليم'], ['/admin/workshops', 'الورش والمقاعد'],
          ['/admin/bookings', 'الجلسات والحجوزات والمواعيد'], ['/admin/memberships', 'الباقات والاشتراكات'], ['/admin/articles', 'المقالات والنشر'],
          ['/admin/media', 'الصور والوسائط'], ['/admin/resources', 'الموارد'], ['/admin/assessments', 'الاختبار والنتائج'], ['/admin/press', 'الظهور الإعلامي'],
          ['/admin/offers', 'العروض'], ['/admin/coupons', 'الكوبونات'], ['/admin/payments', 'قبول ورفض الدفعات'], ['/admin/orders', 'الطلبات والاسترداد'],
          ['/admin/users', 'حسابات العميلات'], ['/admin/roles', 'حسابات الإدارة والصلاحيات'], ['/admin/inbox', 'الرسائل والنشرة'], ['/admin/reviews', 'التقييمات'],
          ['/admin/reports', 'التقارير'], ['/admin/revisions', 'سجل تغييرات المحتوى'], ['/admin/login-history', 'أرشيف الدخول'], ['/admin/security', 'الجلسات والأمان'], ['/admin/audit-logs', 'سجل التدقيق'], ['/admin/system', 'حالة النظام'], ['/admin/delivery', 'الملفات المحمية'],
        ].map(([href, label]) => <Button key={href} href={href} variant="ghost" className="justify-start">{label}</Button>)}</div>
        <p className="text-sm leading-loose text-text-soft">الحذف النهائي للمحتوى غير المرتبط بحقوق أو معاملات. السجلات المرتبطة تُوقف أو تؤرشف من قسمها. كل إجراء يخضع لصلاحيات حسابك عند تنفيذه.</p>
      </Card>
      <Card className="space-y-6 p-8">
        <CardTitle>نصوص الصفحة الرئيسية</CardTitle>
        <p className="text-sm leading-loose text-text-soft">نصوص الرئيسية وصورها وترتيب أقسامها تُدار معًا من محرر الصفحات.</p>
        <Button href="/admin/pages" variant="secondary">فتح محرر الرئيسية</Button>
      </Card>

      <Card className="space-y-6 p-8">
        <CardTitle>الدفع ومهلة الطلب</CardTitle>
        <p className="text-sm leading-loose text-text-soft">حقول واضحة ومتحقق منها؛ وسائل الدفع الفارغة تختفي تلقائيًا من صفحة العميلة.</p>
        <OperationalSettingsForm settings={operational} />
      </Card>
      <Card className="space-y-6 p-8"><CardTitle>تعريف هبة والقيم</CardTitle><p className="text-sm text-text-soft">مصدر واحد لتعريف هبة والاعتمادات في الرئيسية وصفحة «عن هبة». لا تُضاف ادعاءات أو مؤهلات غير مؤكدة تلقائيًا.</p><OwnerProfileEditor profile={ownerProfile}/></Card>

      <Card className="space-y-6 p-8">
        <CardTitle>غلاف صفحة «ابدئي من هنا»</CardTitle>
        <p className="text-sm leading-loose text-text-soft">تحكم منظم في مقدمة الصفحة وبطاقات الحالات والدعوة الختامية. تُدار أسئلة الاختبار ونتائجه وإصداراته من صفحة «الاختبار الإرشادي» المستقلة، والروابط هنا داخلية فقط.</p>
        <StartHereExperienceEditor content={startHereContent} />
      </Card>

      <Card className="space-y-6 p-8">
        <CardTitle>إعدادات متقدمة</CardTitle>
        {settings.filter((setting) => !typedKeys.has(setting.key)).length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent"
            title="لا إعدادات محفوظة"
            description="تُنشأ المفاتيح الافتراضية مع سكربت البيانات التجريبية، ويمكن تعديلها من هنا فور ربط قاعدة البيانات."
          />
        ) : (
          <div className="space-y-6">
            {settings.filter((setting) => !typedKeys.has(setting.key)).map((s) => (
              <SettingEditor key={s.key} settingKey={s.key} initialValue={JSON.stringify(s.value, null, 2)} />
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-8">
        <CardTitle>مفاتيح الميزات</CardTitle>
        {flags.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent"
            title="لا مفاتيح بعد"
            description="مفاتيح الميزات تتحكم في ظهور أقسام مثل ورش العمل وبرنامج VIP."
          />
        ) : (
          <div className="space-y-3">
            {flags.filter(f => !isOperationControl(f.key)).map((f) => (
              <FlagToggle key={f.key} flagKey={f.key} enabled={f.is_enabled} description={f.description} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

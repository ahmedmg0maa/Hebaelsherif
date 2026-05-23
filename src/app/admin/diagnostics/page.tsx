import AdminPageShell from '@/components/admin/AdminPageShell'

const checks = [
  {
    title: 'Firebase Admin',
    items: [
      ['Project ID', Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID)],
      ['Client Email', Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL)],
      ['Private Key', Boolean(process.env.FIREBASE_ADMIN_PRIVATE_KEY)],
    ],
  },
  {
    title: 'الدومين والنشر',
    items: [
      ['NEXT_PUBLIC_APP_URL', Boolean(process.env.NEXT_PUBLIC_APP_URL)],
      ['Google verification', Boolean(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION)],
      ['Google Drive root folder', Boolean(process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER)],
    ],
  },
  {
    title: 'الدفع والتواصل',
    items: [
      ['InstaPay', Boolean(process.env.NEXT_PUBLIC_PAYMENT_INSTAPAY)],
      ['Wallet', Boolean(process.env.NEXT_PUBLIC_PAYMENT_WALLET)],
      ['Bank transfer', Boolean(process.env.NEXT_PUBLIC_PAYMENT_BANK)],
      ['WhatsApp', Boolean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP)],
    ],
  },
  {
    title: 'السوشيال والتحليلات',
    items: [
      ['Facebook', Boolean(process.env.NEXT_PUBLIC_FACEBOOK_URL)],
      ['Instagram', Boolean(process.env.NEXT_PUBLIC_INSTAGRAM_URL)],
      ['TikTok', Boolean(process.env.NEXT_PUBLIC_TIKTOK_URL)],
      ['GA / GTM', Boolean(process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID)],
      ['Clarity', Boolean(process.env.NEXT_PUBLIC_CLARITY_ID || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID)],
    ],
  },
]

export default function AdminDiagnosticsPage() {
  return (
    <AdminPageShell
      eyebrow="تشخيص المنصة"
      title="فحص سريع لجاهزية النشر"
      description="هذه الصفحة لا تعرض أي أسرار. تعرض فقط هل المتغيرات الأساسية مضبوطة أم تحتاج استكمالًا قبل الإطلاق."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {checks.map((section) => (
          <section key={section.title} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
            <h2 className="text-xl font-black text-charcoal">{section.title}</h2>
            <div className="mt-5 space-y-3">
              {section.items.map(([label, ok]) => (
                <div key={String(label)} className="flex items-center justify-between gap-4 rounded-2xl border border-sand bg-cream/70 px-4 py-3">
                  <span className="text-sm font-bold text-warm-gray">{label}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${ok ? 'bg-olive/10 text-olive' : 'bg-gold/10 text-gold'}`}>
                    {ok ? 'مكتمل' : 'يحتاج ضبط'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-[2rem] border border-petrol/15 bg-petrol/10 p-6">
        <h3 className="text-lg font-black text-petrol">ملاحظات تشغيل مهمة</h3>
        <ul className="mt-4 list-disc space-y-2 pr-5 text-sm leading-7 text-warm-gray">
          <li>لو ظهر نقص في Firebase Admin، لن تعمل APIs الخاصة بالأدمن والحجز المدفوع بشكل كامل.</li>
          <li>لو بيانات الدفع غير مكتملة، سيظهر للمستخدمة نص آمن بدل أرقام وهمية.</li>
          <li>روابط السوشيال الفارغة تظهر كأيقونات غير مفعلة حتى لا تقود لرابط خاطئ.</li>
          <li>بعد تعديل Environment Variables على Vercel، يجب عمل Redeploy.</li>
        </ul>
      </div>
    </AdminPageShell>
  )
}

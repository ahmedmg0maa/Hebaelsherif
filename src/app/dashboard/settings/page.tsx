import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardTitle } from '@/components/ui/Card'
import { PasswordForm } from '@/components/dashboard/ProfileForm'
import { AccountDeletionRequestControl } from '@/components/dashboard/AccountDeletionRequestControl'
import { getMyAccountDeletionRequest } from '@/lib/data/account-deletion'

export const metadata: Metadata = { title: 'الإعدادات' }

export default async function SettingsPage() {
  const deletionRequest = await getMyAccountDeletionRequest()
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="mb-2">
        <h1 className="font-heading text-3xl font-bold leading-snug text-deep-teal">الإعدادات</h1>
        <p className="mt-1 text-text-soft">أمان حسابك وتفضيلاتك.</p>
      </header>

      <Card className="p-8">
        <CardTitle className="mb-6">كلمة المرور</CardTitle>
        <PasswordForm />
      </Card>

      <Card className="p-8">
        <CardTitle className="mb-4">البريد والإشعارات</CardTitle>
        <p className="leading-relaxed text-text-soft">
          إشعارات الطلبات والحجوزات تصلك دائمًا داخل المنصة في{' '}
          <Link href="/dashboard/notifications" className="font-semibold text-burgundy underline-offset-4 hover:underline">
            صفحة الإشعارات
          </Link>
          . لا تُرسل المنصة رسائل بريدية دورية حاليًا؛ ستُعلن أي خدمة مراسلات مستقبلية بوضوح قبل تفعيلها.
        </p>
      </Card>

      <Card className="border-burgundy/30 p-8">
        <CardTitle className="mb-4 text-burgundy">حذف الحساب</CardTitle>
        <AccountDeletionRequestControl request={deletionRequest} />
      </Card>
    </div>
  )
}

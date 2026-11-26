import { AuthShell, AuthLink } from '@/components/auth/AuthShell'
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm'

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="عيّني كلمة مرور جديدة"
      lead="تعمل هذه الصفحة فقط بعد فتح رابط الاستعادة الصالح. بعد الحفظ ستسجّلين الدخول مجددًا."
      footer={<>انتهت صلاحية الرابط؟ <AuthLink href="/auth/reset-password">اطلبي رابطًا جديدًا</AuthLink></>}
    >
      <UpdatePasswordForm />
    </AuthShell>
  )
}

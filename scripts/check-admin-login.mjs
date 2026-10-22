// Read-only: no sign-in attempts, password changes, account creation or permission grants.
import { createClient } from '@supabase/supabase-js'
import { adminLoginPrerequisites } from './admin-login-prerequisites.mjs'

const issues = adminLoginPrerequisites()
if (issues.length) { console.error(issues.join('\n')); process.exit(1) }
const env = process.env
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL.trim(), env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim(), { auth: { persistSession: false, autoRefreshToken: false } })
try {
  const email = env.OWNER_ADMIN_EMAIL.trim().toLowerCase()
  let owner = null
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw Error('تعذر قراءة حسابات المصادقة. راجعي عنوان المشروع ومفتاح الخادم.')
    owner = data.users.find(user => user.email?.toLowerCase() === email)
    if (owner || data.users.length < 1000) break
  }
  if (!owner) throw Error('حساب المالكة غير موجود. شغلي launch:owner بعد مراجعة مشروعكِ.')
  if (!owner.email_confirmed_at || (owner.banned_until && Date.parse(owner.banned_until) > Date.now())) throw Error('حساب المالكة غير مؤكد أو موقوف. راجعي حالته قبل التفعيل.')
  const [role, enrollment] = await Promise.all([
    db.from('admin_roles').select('user_id').eq('user_id', owner.id).eq('role', 'owner').maybeSingle(),
    db.from('owner_password_access').select('user_id').eq('user_id', owner.id).eq('enabled', true).maybeSingle(),
  ])
  if (role.error || enrollment.error) throw Error('تعذر قراءة صلاحيات المالكة. قارني ترحيلات قاعدة البيانات؛ لا تعيدي تطبيق التاريخ كله.')
  if (!role.data || !enrollment.data) throw Error('الدخول المختصر للمالكة غير مفعّل. راجعي الحساب الحالي ثم شغلي launch:owner.')
  console.log('بيانات الاتصال وحساب المالكة وتفعيل الدخول المختصر جاهزة. اختبري كلمة المرور من /auth/admin.')
  console.log('هذا فحص قراءة فقط؛ لا يثبت كلمة المرور أو الجلسة أو البريد أو التشغيل الفعلي.')
} catch (error) {
  console.error(error instanceof Error && !/fetch|network|timeout/i.test(error.message) ? error.message : 'تعذر الاتصال لإكمال الفحص. حاولي مجددًا.')
  process.exitCode = 1
}

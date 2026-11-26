import { Suspense } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'
import { AdminLoginForm } from '@/components/auth/AdminLoginForm'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { hasSupabaseServerSecret } from '@/lib/supabase/server'

// Availability reflects runtime configuration; only booleans reach the browser.
export const dynamic = 'force-dynamic'

export default function AdminLoginPage() {
  const configured = hasSupabasePublicConfig() && hasSupabaseServerSecret()
  const ownerConfigured = Boolean(process.env.OWNER_ADMIN_EMAIL?.trim())
  return <AuthShell title="دخول الإدارة" lead="مساحة تشغيل موقعكِ، بحساب الإدارة المفعّل.">
    <Suspense fallback={<p role="status">جارٍ تجهيز الدخول…</p>}><AdminLoginForm configured={configured} ownerConfigured={ownerConfigured} /></Suspense>
  </AuthShell>
}

import type { Metadata } from 'next'
import { getServerClient, getServiceClient } from '@/lib/supabase/server'
import { MembershipPlansManager, SubscriptionCreate, SubscriptionCreditControl, SubscriptionStatusControl, type PlanAdmin } from '@/components/admin/MembershipManager'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { requirePermission } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'الباقات والاشتراكات — الإدارة' }

export default async function AdminMembershipsPage() {
  const admin = await requirePermission('packages.manage', { redirectOnFailure: true })
  const supabase = await getServerClient()
  const [plansResult, subscriptionsResult, servicesResult, productsResult] = await Promise.all([
    supabase.from('subscription_plans').select('*, subscription_plan_services(service_id)').order('sort', { ascending: true }),
    supabase.from('subscriptions').select('id, user_id, plan_id, status, starts_at, ends_at, sessions_used, plan_snapshot, subscription_plans(title, sessions_included), subscription_credit_ledger(delta)').is('archived_at', null).order('created_at', { ascending: false }).limit(200),
    supabase.from('services').select('id,title').order('title'),
    supabase.from('products').select('id,title').in('type',['vip','bundle']).order('title'),
  ])
  const profilesResult = await supabase.from('profiles').select('id, full_name, email').order('created_at',{ascending:false}).limit(500)
  if ([plansResult.error, subscriptionsResult.error, servicesResult.error, productsResult.error, profilesResult.error].some(Boolean)) {
    throw new Error('ADMIN_MEMBERSHIPS_READ_UNAVAILABLE')
  }
  const planRows = plansResult.data, subscriptions = subscriptionsResult.data, serviceRows = servicesResult.data, packageProducts = productsResult.data, profiles = profilesResult.data
  const customerProfiles = (profiles ?? []).filter((profile) => !profile.email.endsWith('@example.invalid'))
  const profileMap = new Map(customerProfiles.map((profile) => [profile.id, profile]))
  const { data: counts, error: countsError } = await getServiceClient().rpc('admin_plan_active_counts', { p_actor_id: admin?.userId, p_plan_ids: (planRows ?? []).map(plan => plan.id) })
  if (countsError || !counts || typeof counts !== 'object') throw new Error('ADMIN_MEMBERSHIP_COUNTS_UNAVAILABLE')
  const plans: PlanAdmin[] = (planRows ?? []).map((plan) => ({
    ...plan,
    price: Number(plan.price),
    features: Array.isArray(plan.features) ? plan.features.map(String) : [],
    activeCount: Number(counts[plan.id] ?? 0),
    eligibleServiceIds: (plan.subscription_plan_services ?? []).map((row: { service_id: string }) => row.service_id),
  }))
  const date = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })

  return <div className="mx-auto max-w-6xl space-y-8">
    <header><p className="text-sm font-bold text-antique-gold">الإيراد المتكرر</p><h1 className="mt-1 text-3xl font-bold text-deep-teal">الباقات والاشتراكات</h1><p className="mt-2 max-w-3xl leading-loose text-text-soft">أنشئي أي عدد من الباقات، حددي السعر والمدة والمزايا والجلسات والسعة وفترة البيع، ثم أوقفي أو انشري كل باقة بشكل مستقل.</p></header>
    <MembershipPlansManager plans={plans} services={serviceRows ?? []} packageProducts={packageProducts ?? []} />
    <SubscriptionCreate plans={plans.filter(plan => !plan.archived_at && plan.is_active).map(plan=>({id:plan.id,title:plan.title}))} customers={customerProfiles.map(profile=>({id:profile.id,name:profile.full_name||'عميلة',email:profile.email}))} />
    <section className="space-y-4"><p className="text-sm text-text-soft">تُعرض أحدث 200 اشتراك غير مؤرشف. أعداد الباقات تحسب جميع الاشتراكات النشطة غير المنتهية.</p><h2 className="font-heading text-2xl font-bold text-deep-teal">اشتراكات العميلات</h2>
      {!subscriptions?.length ? <EmptyState title="لا اشتراكات بعد" description="ستظهر الاشتراكات هنا عند تفعيل أول باقة لعميلة." /> : <Table><THead><tr><TH>العميلة</TH><TH>الباقة</TH><TH>الفترة</TH><TH>رصيد الجلسات</TH><TH>الحالة</TH></tr></THead><TBody>
        {subscriptions.map((subscription) => {
          const profile = profileMap.get(subscription.user_id)
          const plan = subscription.plan_snapshot as { title?: string; sessions_included?: number } | null
          const balance=(subscription.subscription_credit_ledger??[]).reduce((sum,row)=>sum+row.delta,0)
          return <TR key={subscription.id}><TD><p className="font-semibold text-deep-teal">{profile?.full_name || 'عميلة'}</p><p className="text-xs text-taupe" dir="ltr">{profile?.email}</p></TD><TD>{plan?.title ?? '—'}</TD><TD>{date.format(new Date(subscription.starts_at))} — {date.format(new Date(subscription.ends_at))}</TD><TD><SubscriptionCreditControl id={subscription.id} balance={balance} included={plan?.sessions_included??0}/></TD><TD><SubscriptionStatusControl id={subscription.id} status={subscription.status} /></TD></TR>
        })}
      </TBody></Table>}
    </section>
  </div>
}

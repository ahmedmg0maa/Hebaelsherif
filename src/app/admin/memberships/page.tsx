import {adminPagedList,type AdminPageQuery} from '@/lib/data/admin-pagination'
import {AdminListTools} from '@/components/admin/AdminListTools'
import type { Metadata } from 'next'
import { getServiceClient } from '@/lib/supabase/server'
import { MembershipPlansManager, SubscriptionCreate, SubscriptionCreditControl, SubscriptionStatusControl, type PlanAdmin } from '@/components/admin/MembershipManager'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { requirePermission } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'الباقات والاشتراكات — الإدارة' }

export default async function AdminMembershipsPage({searchParams}:{searchParams:Promise<AdminPageQuery>}) {
  const admin = await requirePermission('packages.manage', { redirectOnFailure: true })
  const query=await searchParams
  type Sub={id:string;user_id:string;status:string;starts_at:string;ends_at:string;plan_snapshot:{title?:string;sessions_included?:number}|null;full_name:string|null;email:string|null;balance:number}
  const [plansResult,subscriptionsResult]=await Promise.all([
   adminPagedList<PlanAdmin&{subscription_plan_services:{service_id:string}[]}>('subscription_plans','*,subscription_plan_services(service_id)',query,{prefix:'plan_',searchColumn:'title',orderBy:'sort',ascending:true,statusFilters:{active:{column:'is_active',value:true},inactive:{column:'is_active',value:false},archived:{column:'archived_at',value:null,not:true}}}),
   adminPagedList<Sub>('admin_subscription_directory','id,user_id,status,starts_at,ends_at,plan_snapshot,full_name,email,balance',query,{prefix:'subscription_',searchColumn:'search_text',statuses:['active','pending','expired','cancelled'],nulls:['archived_at']}),
  ])
  const planRows=plansResult.rows,subscriptions=subscriptionsResult.rows
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
    <AdminListTools result={plansResult} query={query} label="الباقات" statuses={[{value:"active",label:"نشطة"},{value:"inactive",label:"متوقفة"},{value:"archived",label:"مؤرشفة"}]}/>
    <MembershipPlansManager plans={plans} services={[]} packageProducts={[]} />
    <SubscriptionCreate />
    <section className="space-y-4"><p className="text-sm text-text-soft">يمكن الوصول لكل الاشتراكات غير المؤرشفة بالبحث والصفحات. أعداد الباقات تحسب جميع الاشتراكات النشطة غير المنتهية.</p><h2 className="font-heading text-2xl font-bold text-deep-teal">اشتراكات العميلات</h2>
      <AdminListTools result={subscriptionsResult} query={query} label="الاشتراكات" searchLabel="بحث بالعميلة أو الباقة أو رقم الاشتراك" statuses={[{value:"active",label:"نشط"},{value:"pending",label:"بانتظار التفعيل"},{value:"expired",label:"منتهٍ"},{value:"cancelled",label:"ملغى"}]}/>
      {!subscriptions?.length ? <EmptyState title="لا اشتراكات بعد" description="ستظهر الاشتراكات هنا عند تفعيل أول باقة لعميلة." /> : <Table><THead><tr><TH>العميلة</TH><TH>الباقة</TH><TH>الفترة</TH><TH>رصيد الجلسات</TH><TH>الحالة</TH></tr></THead><TBody>
        {subscriptions.map((subscription) => {
          const profile=subscription
          const plan = subscription.plan_snapshot as { title?: string; sessions_included?: number } | null
          const balance=Number(subscription.balance)
          return <TR key={subscription.id}><TD><p className="font-semibold text-deep-teal">{profile?.full_name || 'عميلة'}</p><p className="text-xs text-taupe" dir="ltr">{profile?.email}</p></TD><TD>{plan?.title ?? '—'}</TD><TD>{date.format(new Date(subscription.starts_at))} — {date.format(new Date(subscription.ends_at))}</TD><TD><SubscriptionCreditControl id={subscription.id} balance={balance} included={plan?.sessions_included??0}/></TD><TD><SubscriptionStatusControl id={subscription.id} status={subscription.status} /></TD></TR>
        })}
      </TBody></Table>}
    </section>
  </div>
}

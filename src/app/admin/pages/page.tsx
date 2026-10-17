import { LearningTemplateButton } from '@/components/admin/LearningTemplateButton'
import { HomeDraftControl } from '@/components/admin/HomeDraftControl'
import { getHomeArticleOptions } from '@/lib/data/home'
import type { Metadata } from 'next'
import { adminPagedList,type AdminPageQuery } from '@/lib/data/admin-pagination'
import { AdminListTools } from '@/components/admin/AdminListTools'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CmsPageCreator, CmsPageEditor, CmsSectionEditor, NavigationEditor } from '@/components/admin/CmsStructureManager'
import { PreviewButton } from '@/components/admin/PreviewButton'
import { HomeSectionManager } from '@/components/admin/HomeSectionManager'
import { getHomeCopy, getPublicMediaOptions } from '@/lib/data/cms'

export const metadata: Metadata = { title: 'الصفحات — الإدارة' }

type Row = {
  id: string
  slug: string
  title: string
  seo_title: string | null
  seo_description: string | null
  is_published: boolean
  status: string
  publish_at: string | null
  canonical_url: string | null
  og_image_url: string | null
  legal_review_status: string
  legal_version: string | null
  effective_at: string | null
  page_sections: { id:string;name:string;kind:string;sort:number;is_visible:boolean;content:unknown }[]
}
type NavRow={id:string;menu:string;label:string;href:string;sort:number;is_visible:boolean}

export default async function AdminPagesPage({searchParams}:{searchParams:Promise<AdminPageQuery>}) {
  const query=await searchParams
  const [result, homeCopy, media, articles] = await Promise.all([
    adminPagedList<Row>('pages', 'id, slug, title, seo_title, seo_description, is_published, status, publish_at, canonical_url, og_image_url, legal_review_status, legal_version, effective_at, page_sections(id,name,kind,sort,is_visible,content)',query, {
      searchColumn:'title',statuses:['draft','scheduled','published','archived'],
      orderBy: 'slug',
      ascending: true,
    }),
    getHomeCopy(),
    getPublicMediaOptions(200, true),
    getHomeArticleOptions(),
  ])
  const pages=result.rows
  const navigationResult=await adminPagedList<NavRow>('navigation_items','id,menu,label,href,sort,is_visible',query,{prefix:'navigation_',searchColumn:'label',orderBy:'sort',ascending:true,statusFilters:{visible:{column:'is_visible',value:true},hidden:{column:'is_visible',value:false}}})
  const navigation=navigationResult.rows

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <HomeDraftControl />
      <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer font-bold text-deep-teal">قالب بديل — يغيّر المحتوى عند تطبيقه</summary><LearningTemplateButton /></details>
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">الصفحات</h1>
        <p className="mt-1 text-text-soft">عناوين SEO والوصف لكل صفحة، مع التحكم في النشر.</p>
      </header>

      <CmsPageCreator />
      <AdminListTools result={result} query={query} label="الصفحات" statuses={[{value:'draft',label:'مسودة'},{value:'scheduled',label:'مجدولة'},{value:'published',label:'منشورة'},{value:'archived',label:'مؤرشفة'}]}/>

      {pages.length === 0 ? (
        <EmptyState
          title="لا صفحات CMS بعد"
          description="أضيفي صفحة من النموذج أعلاه ثم رتّبي أقسامها وراجعيها قبل النشر."
        />
      ) : (
        <div className="space-y-5">
          {pages.map((p) => (
            <Card key={p.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-deep-teal">{p.title}</h2>
                  <p className="text-xs text-taupe" dir="ltr">/{p.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={p.is_published ? 'success' : 'sand'}>{{draft:'مسودة',scheduled:'مجدولة',published:'منشورة',archived:'مؤرشفة'}[p.status]??'حالة غير متاحة'}</Badge>
                  <PreviewButton type="page" id={p.id}/>
                </div>
              </div>
              <CmsPageEditor page={p} media={media}/>
              <details className="rounded-xl border border-line"><summary className="cursor-pointer list-none px-4 py-3 font-bold text-deep-teal">بنية الصفحة ({p.page_sections.length.toLocaleString('ar-EG')} أقسام)</summary><div className="space-y-3 border-t border-line p-4">{p.slug === 'home' ? <HomeSectionManager articles={articles} assets={media} pageId={p.id} sections={p.page_sections.map((section) => section.kind === 'hero' && (!section.content || Object.keys(section.content as object).length === 0) ? { ...section, content: homeCopy } : section)} /> : <>{p.page_sections.sort((a,b)=>a.sort-b.sort).map(section=><CmsSectionEditor key={section.id} pageId={p.id} section={section}/>)}<CmsSectionEditor pageId={p.id}/></>}</div></details>
            </Card>
          ))}
        </div>
      )}
      <section className="space-y-4"><header><h2 className="text-2xl font-bold text-deep-teal">القوائم والرأس والتذييل</h2><p className="text-sm text-text-soft">أضيفي الروابط ورتبيها وانشريها دون تعديل الكود.</p></header><AdminListTools result={navigationResult} query={query} label="روابط القوائم" searchLabel="بحث باسم الرابط" statuses={[{value:"visible",label:"ظاهر"},{value:"hidden",label:"مخفي"}]}/>{navigation.map(item=><NavigationEditor key={item.id} item={item}/>)}<NavigationEditor/></section>
    </div>
  )
}

import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getPublishedCmsPage} from '@/lib/data/cms'
import {normalizeCmsProse,type CmsProseSection} from '@/lib/cms/prose'
import {ProsePage} from '@/components/catalog/ProsePage'
type Props={params:Promise<{slug:string}>}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>80)return {robots:{index:false}}
 const page=await getPublishedCmsPage(slug);return page?{title:page.seoTitle||page.title,description:page.seoDescription||undefined,alternates:{canonical:page.canonicalUrl||`/${slug}`},openGraph:{title:page.seoTitle||page.title,...(page.ogImageUrl?{images:[page.ogImageUrl]}:{})}}:{robots:{index:false}}
}
export default async function ManagedPublicPage({params}:Props){
 const {slug}=await params
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>80)notFound()
 const page=await getPublishedCmsPage(slug);if(!page)notFound()
 const sections=page.sections.map(s=>normalizeCmsProse(s.content)).filter((s):s is CmsProseSection=>Boolean(s))
 return <ProsePage eyebrow="هبة الشريف" title={page.title} lead="" sections={sections}/>
}

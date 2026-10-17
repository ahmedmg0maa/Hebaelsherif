import {defaultOwnerProfile,type OwnerProfile} from '@/lib/owner/profile'
import { normalizeHomeCopy, type HomeCopy } from './hero'
import { HOME_PRESENTATION } from './presentation'
import { isHomeSectionKind, normalizeHomeContent, type HomeSection } from './sections'

export function homeDraftSections(rows: {id:string;name:string;kind:string;sort:number;is_visible:boolean;content:unknown}[]): HomeSection[] {
  return rows.flatMap(row=>isHomeSectionKind(row.kind)?[{id:row.id,name:row.name,kind:row.kind,sort:row.sort,isVisible:row.is_visible,content:normalizeHomeContent(row.kind,row.content)}]:[])
}

export type HomeDraftMedia=Record<string,{url:string;alt:string}>
type PublicOwner=Pick<OwnerProfile,'professionalLine'|'credentials'>
function sectionImages(section:HomeSection,media:HomeDraftMedia){
 const selected=(slot:string)=>{const ref=section.content.media?.[slot],asset=ref?media[ref.assetId]:null;return ref&&asset?{url:asset.url,alt:ref.alt,x:ref.x,y:ref.y}:null}
 if(section.kind==='hero')return [selected('main')??HOME_PRESENTATION.heroImage]
 if(section.kind==='pathways'){const items=(section.content as {items?:{href:string;title:string}[]}).items??[];return items.flatMap((item,index)=>{const image=selected('portal'+index),fallback=HOME_PRESENTATION.portalImages[item.href];return image?[image]:fallback?[{url:fallback,alt:item.title,x:50,y:50}]:[]})}
 if(section.kind==='articles')return [HOME_PRESENTATION.readingImage]
 const image=selected('main');return image?[image]:[]
}
export function captureHomeSnapshot(sections: HomeSection[], copy: HomeCopy, owner:PublicOwner=defaultOwnerProfile, media:HomeDraftMedia={}) {
  return {
    format: 1,
    presentation: HOME_PRESENTATION,
    publicOwner:{professionalLine:owner.professionalLine,credentials:owner.credentials.filter(item=>item.verified)},
    // These remain live references to the existing catalog/profile. No second
    // price, enrollment, review, or copy of customer data is created.
    sources: ['published_catalog', 'owner_profile', 'published_articles', 'published_offers'],
    sections: [...sections].sort((a, b) => a.sort - b.sort).map(section => ({
      images:sectionImages(section,media),
      name: section.name, kind: section.kind, sort: section.sort, isVisible: section.isVisible,
      content: section.kind === 'hero' ? {...normalizeHomeCopy(section.content, copy),...(section.content.media?{media:section.content.media}:{})} : normalizeHomeContent(section.kind, section.content),
    })),
  }
}
export type HomeSnapshot = ReturnType<typeof captureHomeSnapshot>
function displayedContent(snapshot:HomeSnapshot,section:HomeSnapshot['sections'][number]|undefined){
 if(!section)return undefined
 if(section.kind==='trust')return snapshot.publicOwner?.credentials?.length?snapshot.publicOwner.credentials.flatMap(item=>[item.value,item.label]):['لا يعرض القسم اعتمادات حاليًا؛ مصدر العرض هو الاعتمادات الموثقة في تعريف هبة.']
 if(section.kind==='hero')return {...section.content,eyebrow:snapshot.publicOwner?.professionalLine||(section.content as HomeCopy).eyebrow}
 return section.content
}
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}
export function compareHomeSnapshots(before: HomeSnapshot, after: HomeSnapshot) {
  const kinds = [...new Set([...before.sections.map(s => s.kind), ...after.sections.map(s => s.kind)])]
  return {
    presentationChanged: canonical(before.presentation) !== canonical(after.presentation),
    sections: kinds.map(kind => {
      const old = before.sections.find(s => s.kind === kind), next = after.sections.find(s => s.kind === kind)
      return { kind, name: next?.name ?? old?.name ?? kind, added: !old, removed: !next,
        orderChanged: old?.sort !== next?.sort, visibilityChanged: old?.isVisible !== next?.isVisible,
        contentChanged: canonical(displayedContent(before,old)) !== canonical(displayedContent(after,next)),
        ignoredContentChanged:kind==='trust'&&canonical(old?.content)!==canonical(next?.content),
        imagesChanged:canonical(old?.images)!==canonical(next?.images),beforeImages:old?.images??[],afterImages:next?.images??[],
        beforeText: readableHomeContent(displayedContent(before,old)), afterText: readableHomeContent(displayedContent(after,next)),
      }
    }),
  }
}
function readableHomeContent(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(readableHomeContent)
  if(value&&typeof value==='object'&&'headlineStart' in value){const row=value as HomeCopy;return [row.eyebrow,[row.headlineStart,row.headlineAccent,row.headlineMiddle,row.headlinePath,row.headlineEnd].join(' '),'الكلمة المتحركة: '+row.headlineAwareness,row.lead,'زر اكتشاف المسار: '+row.primaryCta,'زر الحجز: '+row.secondaryCta,row.imageTitle,row.imageLead]}
  if (value && typeof value === 'object') return Object.entries(value).filter(([key])=>key!=='assetId').flatMap(([,item])=>readableHomeContent(item))
  return []
}
